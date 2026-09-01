import json
from dataclasses import dataclass, asdict
import datetime
import logging
from dateutil import parser
from model.Person import Person


@dataclass
class Exam(dict):
    """
    an exam to be taken
    
    author: Marcel Suter
    """

    exam_uuid: str
    event_uuid: str
    student: Person
    teacher: Person
    cohort: str
    module: str
    exam_num: str
    missed: datetime.date
    duration: int
    room: str
    remarks: str
    tools: str
    status: str
    invited: bool = False

    def to_json(self, response=True) -> str:
        '''
        converts the exam to a json string
        :param response: if True, the teacher and student are converted to dicts, otherwise email addresses are used
        :return: json string
        '''
        try:
            data = {
                'exam_uuid': self.exam_uuid,
                'cohort': self.cohort,
                'module': self.module,
                'exam_num': self.exam_num,
                'missed': self.missed.strftime("%Y-%m-%d"),
                'duration': str(self.duration),
                'room': self.room,
                'remarks': self.remarks,
                'tools': self.tools,
                'event_uuid': self.event_uuid,
                'status': self.status,
                'invited': self.invited
            }

            if response:
                data['teacher'] = asdict(self.teacher)
                data['teacher']['fullname'] = self.teacher.fullname
                data['student'] = asdict(self.student)
                data['student']['fullname'] = self.student.fullname
            else:
                data['teacher'] = self.teacher.email
                data['student'] = self.student.email
            jstring = json.dumps(data)
            return jstring

        except Exception:
            logging.exception("An exception was thrown!")
            logging.exception('exam_uuid: ' + self.exam_uuid)
            raise ValueError

    @property
    def status_text(self) -> str:
        """
        returns the status text of the exam
        :return: status text
        """
        status_map = {
            '10': 'pendent',
            '20': 'offen',
            '30': 'abgegeben',
            '35': 'elektronisch',
            '40': 'erhalten',
            '50': 'absolviert',
            '80': 'pnab',
            '90': 'gelöscht'
        }
        return status_map.get(self.status, 'unbekannt')

    @property
    def exam_uuid(self) -> str:
        return self._exam_uuid

    @exam_uuid.setter
    def exam_uuid(self, value) -> None:
        self._exam_uuid = value

    @property
    def teacher(self) -> Person:
        return self._teacher

    @teacher.setter
    def teacher(self, value) -> None:
        self._teacher = value

    @property
    def student(self) -> Person:
        return self._student

    @student.setter
    def student(self, value) -> None:
        self._student = value

    @property
    def cohort(self) -> str:
        return self._cohort

    @cohort.setter
    def cohort(self, value) -> None:
        self._cohort = value

    @property
    def module(self) -> str:
        return self._module

    @module.setter
    def module(self, value) -> None:
        self._module = value

    @property
    def exam_num(self) -> str:
        return self._exam_num

    @exam_num.setter
    def exam_num(self, value) -> None:
        self._exam_num = value

    @property
    def missed(self) -> datetime:
        return self._missed

    @missed.setter
    def missed(self, value) -> None:
        if value is None or isinstance(value, datetime.date):
            self._missed = value
        else:
            self._missed = parser.parse(value)

    @property
    def duration(self) -> int:
        return self._duration

    @duration.setter
    def duration(self, value) -> None:
        self._duration = value

    @property
    def room(self) -> str:
        return self._room

    @room.setter
    def room(self, value) -> None:
        self._room = value

    @property
    def remarks(self) -> str:
        return self._remarks

    @remarks.setter
    def remarks(self, value) -> None:
        self._remarks = value

    @property
    def tools(self) -> str:
        return self._tools

    @tools.setter
    def tools(self, value) -> None:
        self._tools = value

    @property
    def event_uuid(self) -> str:
        return self._event_uuid

    @event_uuid.setter
    def event_uuid(self, value) -> None:
        self._event_uuid = value

    @property
    def status(self) -> str:
        return self._status

    @status.setter
    def status(self, value) -> None:
        self._status = value


if __name__ == '__main__':
    ''' Check if started directly '''
    pass
