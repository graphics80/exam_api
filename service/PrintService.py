import io
import json
import uuid

from flask import make_response, current_app, send_file
from flask_restful import Resource, reqparse
from fpdf import FPDF

from data.ExamDAO import ExamDAO
from data.EventDAO import EventDAO
from util.authorization import token_required, teacher_required
from util.replace import replace_text


class PrintService(Resource):
    """
    services for printing
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
    def get(self, exam_uuid):
        """
        sends a pdf for one exam
        :param exam_uuid: the unique key
        :return: http response
        """
        exam_dao = ExamDAO()
        exam = exam_dao.read_exam(exam_uuid)
        filename = current_app.config['TEMPLATEPATH'] + 'sheet.json'
        file = open(filename, encoding='UTF-8')
        texts = json.load(file)
        if exam is not None:
            pdf = FPDF()
            pdf.set_font('helvetica', '', 12)
            pdf.set_fill_color(r=192, g=192, b=192)
            pdf.set_line_width(0.5)
            data = self.build_dict(exam)
            self.make_page(data, texts, pdf)

            return send_file(io.BytesIO(pdf.output()),
                             mimetype='application/pdf',
                             as_attachment=True,
                             download_name='cover.pdf'
                             )
        else:
            return make_response('not found', 404)

    @token_required
    @teacher_required
    def put(self):
        """
        sends a pdf for a list of exams
        :return: response with path to pdf
        """
        args = self.parser.parse_args()
        exam_uuids = []
        for arg in args['exam_uuid']:
            exam_uuid = ''
            if isinstance(arg, list):
                for character in arg:
                    exam_uuid += character
            else:
                exam_uuid = arg
            exam_uuids.append(exam_uuid)

        response = make_response(
            self.build_pdf(exam_uuids)
        )
        return response

    def build_pdf(self, uuid_list):
        """
        builds the pdf for a list of exam-uuids
        :param uuid_list: exam-uuids
        :return: uuid of the pdf-file
        """
        exam_dao = ExamDAO()
        pdf = FPDF()
        pdf.set_font('helvetica', '', 12)
        pdf.set_fill_color(r=192, g=192, b=192)
        pdf.set_line_width(0.5)
        filename = current_app.config['TEMPLATEPATH'] + 'sheet.json'
        file = open(filename, encoding='UTF-8')
        texts = json.load(file)
        for exam_uuid in uuid_list:
            exam = exam_dao.read_exam(exam_uuid)
            if exam is not None:
                data = self.build_dict(exam)
                self.make_page(data, texts, pdf)
        pdf_filename = uuid.uuid4().hex + '.pdf'
        pdf.output(current_app.config['OUTPUTPATH'] + pdf_filename)
        return pdf_filename

    def make_page(self, data, texts, pdf):
        """
        makes a pdf page for the exam
        :param data: dict with placeholders and data values
        :param texts: the text elements
        :param pdf: the pdf object
        :return:
        """
        margin_left = 15
        margin_top = 25
        pdf.add_page()
        for item in texts:
            xcoord = margin_left + item['xcoord'] * 4
            ycoord = margin_top + item['ycoord'] * 6
            if item['type'] == 'text':
                content = replace_text(data, item['content'])
                style = ''
                if item.get('bold') is not None:
                    style = 'B'
                pdf.set_font(style=style, family='helvetica')
                for line in content.split('\n'):
                    words = line.split()
                    length = 0
                    text = ''
                    for word in words:
                        if length + len(word) >= 40:
                            pdf.text(xcoord, ycoord, text)
                            ycoord += 6
                            line = line[length + 1:]
                            length = 0
                            text = ''
                        else:
                            length += len(word) + 1
                            text += word + ' '

                    pdf.text(xcoord, ycoord, line)
                    ycoord += 6
            elif item['type'] == 'line':
                ycoord -= 3
                xcoord_end = xcoord + item['width'] * 4
                ycoord_end = ycoord
                pdf.line(xcoord, ycoord, xcoord_end, ycoord_end)
            elif item['type'] == 'rect':
                ycoord -= 3
                width = item['width'] * 4
                height = item['height'] * 4
                if item.get('fill') is None:
                    pdf.rect(xcoord, ycoord, width, height)
                else:
                    pdf.rect(xcoord, ycoord, width, height, style='F', round_corners=True, corner_radius=4)

    def build_dict(self, exam):
        """
        creates a dict with placeholders and values
        :param exam: the exam with the data
        :return: pdf file
        """
        event_dao = EventDAO()
        event = event_dao.read_event(exam.event_uuid)
        data = {'student.firstname': exam.student.firstname,
                'student.lastname': exam.student.lastname,
                'teacher.firstname': exam.teacher.firstname,
                'teacher.lastname': exam.teacher.lastname,
                'cohort': exam.cohort,
                'missed': exam.missed,
                'module': exam.module,
                'exam_num': exam.exam_num,
                'exam_status': exam.status_text,
                'duration': str(exam.duration),
                'event.date': f'{event.timestamp[8:10]}.{event.timestamp[5:7]}.{event.timestamp[0:4]}',
                'event.time': f'{event.timestamp[14:19]}',
                'room': exam.room,
                'tools': exam.tools,
                'remarks': exam.remarks,
                'environment_label': 'Prüfungsumgebung' if exam.status == '35' else '',
                'environment': exam.environment if exam.status == '35' and exam.environment else ''
                }
        return data
