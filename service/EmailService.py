import datetime
from contextlib import nullcontext

from flask import make_response, current_app
from flask_mail import Mail, Message
from flask_restful import Resource, reqparse

from data.ExamDAO import ExamDAO
from data.EventDAO import EventDAO
from data.PersonDAO import PersonDAO
from util.authorization import token_required, teacher_required
from util.replace import replace_text, plain_text

#: exam status values where the teacher has not deposited the exam documents yet
MISSING_DOCUMENTS = ['10', '20']


class EmailService(Resource):
    """
    services for sending emails
    author: Marcel Suter
    """

    def __init__(self):
        """
        constructor

        Parameters:

        """
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('exam_uuid', location='form', type=list, default=None, help='uuid', action='append')

    @token_required
    @teacher_required
    def get(self, exam_uuid, status):
        """
        sends an email
        :param exam_uuid: the unique key
        :param status: the template for the email
        :return: http response
        """
        if status not in [None, '10', '20', '30', '35', '40']:
            return make_response('{"message": "invalid status"}', 500)

        exam_dao = ExamDAO()
        exam = exam_dao.read_exam(exam_uuid)
        if exam is None:
            return make_response('{"message": "not found"}', 404)

        if not create_email(exam, status):
            return make_response('{"message": "event not found"}', 404)
        return make_response('{"message": "email sent"}', 200)

    @token_required
    @teacher_required
    def put(self, type):
        """
        sends an email to each student in a list of exams
        :param type: the type of email to send
        :return: response with path to pdf
        """
        if type not in ['invitation', 'reminder']:
            return make_response('{"message": "invalid type"}', 400)

        args = self.parser.parse_args()
        exam_dao = ExamDAO()

        count = 0
        with mail_connection() as connection:
            for exam_uuid in args['exam_uuid'] or []:
                exam = exam_dao.read_exam(''.join(exam_uuid))
                if exam is None:
                    continue
                if type == 'reminder' and exam.status not in MISSING_DOCUMENTS:
                    continue
                if not create_email(exam, type, connection):
                    continue
                if type == 'invitation':
                    exam.invited = True
                count += 1
        if type == 'invitation':
            exam_dao.save_exams()
        return make_response(f'{count} Email(s) gesendet', 200)


def mail_connection():
    """
    opens a single smtp connection to be reused for a batch of emails
    the handshake costs far more than a message, so opening one per email
    makes a batch unusably slow
    :return: a context manager, empty if sending is switched off
    """
    if current_app.config['MAIL_SERVER'] == 'localhost':
        return nullcontext()
    return Mail(current_app).connect()


def create_email(exam, status, connection=None):
    """
    creates an email for the selected exam and type
    :param exam: the unique uuid for an exam
    :param status: the type of email (missed, ...)
    :param connection: an open smtp connection to reuse, or None for a single email
    :return: successful
    """
    event_dao = EventDAO()
    event = event_dao.read_event(exam.event_uuid)
    if event is None or not event.supervisors:
        current_app.logger.error(
            f'no email for exam {exam.exam_uuid}: '
            f'event {exam.event_uuid} is unknown or has no supervisor'
        )
        return False

    person_dao = PersonDAO()
    supervisors = [person_dao.read_person(email) for email in event.supervisors]
    chief_supervisor = supervisors[0]
    supervisor_emails = ', '.join(person.email for person in supervisors)
    filename = current_app.config['TEMPLATEPATH']

    cc = [exam.teacher.email]
    recipient = exam.student.email
    if status == 'reminder':
        filename += 'reminder.txt'
        sender = chief_supervisor.email
        recipient = exam.teacher.email
        cc = []
        subject = 'Fehlende Prüfungsunterlagen'
    elif status == 'invitation':
        filename += 'invitation.txt'
        sender = chief_supervisor.email
        for supervisor in supervisors:
            if supervisor.email not in cc:
                cc.append(supervisor.email)
        subject = 'Aufgebot zur Nachprüfung'
    else:
        sender = exam.teacher.email
        subject = 'Verpasste Prüfung'
        if status == '10':
            if event.status == 'unassigned':
                filename += 'missed_open.txt'
            else:
                filename += 'missed.txt'
        elif status == '20' and event.status == 'unassigned':
            filename += 'missed_open.txt'
        else:
            filename += 'missed2.txt'

    file = open(filename, encoding='UTF-8')
    text = file.read()
    event_start = datetime.datetime.strptime(event.timestamp, '%Y-%m-%d %H:%M:%S')
    event_door = event_start - datetime.timedelta(minutes=15)
    data = {'student.firstname': exam.student.firstname,
            'student.lastname': exam.student.lastname,
            'teacher.firstname': exam.teacher.firstname,
            'teacher.lastname': exam.teacher.lastname,
            'teacher.email': exam.teacher.email,
            'supervisors': ', '.join(person.fullname for person in supervisors),
            'supervisors.emails': supervisor_emails,
            # die Vorlagen liegen unter TEMPLATEPATH und koennen aelter sein
            # als der Code, darum bleiben die bisherigen Platzhalter gueltig
            'supervisor': supervisor_emails,
            'chief_supervisor.firstname': chief_supervisor.firstname,
            'chief_supervisor.lastname': chief_supervisor.lastname,
            'chief_supervisor.email': chief_supervisor.email,
            'missed': exam.missed,
            'module': exam.module,
            'event.date': event_start.strftime('%d.%m.%Y'),
            'event.time': event_start.strftime('%H:%M'),
            'event.door': event_door.strftime('%H:%M'),
            'eventlist': event_dao.open_events(),
            'room': exam.room,
            'duration': str(exam.duration),
            'tools': plain_text(exam.tools)
            }
    text = replace_text(data, text)
    current_app.logger.info(f'cc={cc}')
    send_email(sender, recipient, cc, subject, text, connection)
    return True


def send_email(sender, recipient, carboncopy, subject, content, connection=None):
    """
    sends an email
    :param sender: email address of the sender
    :param recipient:  email address of the recipient
    :param carboncopy: the cc recipients
    :param subject: subject of the email
    :param content: email text
    :param connection: an open smtp connection to reuse, or None to open one
    :return: None
    """
    if current_app.config['MAIL_SERVER'] == 'localhost':
        return
    msg = Message(
        subject=subject,
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[recipient],
        reply_to=sender,
        cc=carboncopy
    )
    msg.body = content
    if connection is None:
        Mail(current_app).send(msg)
    else:
        connection.send(msg)
