import uuid

from flask import make_response
from flask_restful import Resource, reqparse

from data.PersonDAO import PersonDAO
from util.authorization import token_required, teacher_required
from data.ExamDAO import ExamDAO
from model.Exam import Exam


class ExamService(Resource):
    """
    services for CRUD of a single exam

    author: Marcel Suter
    """

    def __init__(self):
        """
        constructor

        Parameters:

        """
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('exam_uuid', location='form', default=None, help='uuid')
        self.parser.add_argument('event_uuid', location='form', default=None, help='event_uuid')
        self.parser.add_argument('student', location='form', default=None, help='student')
        self.parser.add_argument('teacher', location='form', default=None, help='teacher')
        self.parser.add_argument('cohort', location='form', default=None, help='cohort')
        self.parser.add_argument('module', location='form', default=None, help='module')
        self.parser.add_argument('exam_num', location='form', default=None, help='exam-num')
        self.parser.add_argument('duration', location='form', type=int, default=0, help='Muss eine Ganzzahl sein')
        self.parser.add_argument('room', location='form', type=str, default=None, help='Raum')
        self.parser.add_argument('missed', location='form', default=None, help='Muss ein gültiges Datum sein')
        self.parser.add_argument('remarks', location='form', default=None, help='remarks')
        self.parser.add_argument('tools', location='form', default=None, help='tools')
        self.parser.add_argument('status', location='form', default=None, help='status')
        self.parser.add_argument('environment', location='form', default=None, help='Prüfungsumgebung')

    @token_required
    def get(self, exam_uuid):
        """
        gets an exam identified by the uuid
        :param exam_uuid: the unique key
        :return: http response
        """
        exam_dao = ExamDAO()
        exam = exam_dao.read_exam(exam_uuid)
        data = '{}'
        http_status = 404
        if exam is not None:
            http_status = 200
            data = exam.to_json()

        return make_response(
            data, http_status
        )

    @token_required
    @teacher_required
    def post(self):
        """
        creates a new exam
        :return: http response
        """
        args = self.parser.parse_args()
        args.room = 'H100'
        args.environment = args.environment or ''
        if self.save(args, True):
            return make_response('exam saved', 201)
        else:
            return make_response('missing parameters', 400)

    @token_required
    @teacher_required
    def put(self):
        """
        updates an existing exam identified by the uuid
        :return:
        """
        args = self.parser.parse_args()
        if self.save(args, False):
            return make_response('exam saved', 201)
        else:
            return make_response('missing parameters', 400)

    def save(self, args, new: bool):
        """
        saves the new or updated exam
        :param args:
        :param new: is a new exam
        :return:
        """
        exam_dao = ExamDAO()
        invited = False
        oldExam = None
        if new is False:
            oldExam = exam_dao.read_exam(args.exam_uuid)
            if oldExam is None:
                return False
            else:
                if oldExam.event_uuid != args.event_uuid:
                    invited = oldExam.invited

        person_dao = PersonDAO()
        teacher = None
        if args.teacher is not None:
            teacher = person_dao.read_person(args.teacher)
        student = None
        if args.student is not None:
            student = person_dao.read_person(args.student)

        if args.exam_uuid is None or args.exam_uuid == '':
            args.exam_uuid = str(uuid.uuid4())
        # die Pruefungsumgebung gilt nur fuer elektronische Pruefungen
        # massgebend ist der Status nach dem Update: der mitgesendete, sonst der
        # gespeicherte. So haelt die Regel auch bei einem Teil-Update wie
        # changeExam(), das beim Raumwechsel nur dieses eine Feld sendet
        status = args.status
        if status is None and oldExam is not None:
            status = oldExam.status
        if status != '35':
            args.environment = ''
        exam = Exam(
            exam_uuid=args.exam_uuid,
            teacher=teacher,
            student=student,
            cohort=args.cohort,
            module=args.module,
            exam_num=args.exam_num,
            duration=args.duration,
            missed=args.missed,
            room=args.room,
            remarks=args.remarks,
            tools=args.tools,
            event_uuid=args.event_uuid,
            status=args.status,
            invited=invited,
            environment=args.environment
        )
        exam_dao.update_exam(exam)
        return True


if __name__ == '__main__':
    ''' Check if started directly '''
    pass
