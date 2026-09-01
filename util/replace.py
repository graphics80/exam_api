import datetime


def replace_text(data: dict, text: str) -> str:
    """
    replace a placeholder with data
    :param data:
    :param text:
    :return:
    """
    for key, value in data.items():
        placeholder = '{{' + key + '}}'
        if isinstance(value, datetime.datetime):
            value = value.strftime("%d.%m.%Y")
        text = text.replace(placeholder, value)
    return text


def plain_text(value) -> str:
    """
    turns a stored text into a readable one
    line breaks are stored as the marker CRLF, see ExamDAO.save_exams()
    :param value: the stored text
    :return: the text with real line breaks
    """
    if value is None:
        return ''
    return value.replace('CRLF', '\n')
