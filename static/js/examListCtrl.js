/**
 * controller for examlist
 */

/* initialize */
let peopleDelay;
showMessage("info", "Lade Daten ...", 1);
readEventList(["dateSearch", "event_uuid"]);

/* main listener */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("editform").classList.add("d-none");
    if (role !== "teacher") {
        document.getElementById("studentSearch").value = user;
        document.getElementById("examadd").hidden = true;
        lockForm("editform", true);
        lockForm("filterForm", true);
    } else {
        document.getElementById("teacherSearch").value = user;
        document.getElementById("filterForm").addEventListener("submit", searchExamlist);

        document.getElementById("examadd").hidden = false;
        lockForm("editform", false);
        lockForm("filterForm", false);
        document.getElementById("editform").addEventListener("submit", submitExam);
        document.getElementById("editform").addEventListener("reset", resetForm);
        document.getElementById("student.fullname").addEventListener("keyup", searchPeople);
        document.getElementById("student.fullname").addEventListener("change", setPerson);
        document.getElementById("teacher.fullname").addEventListener("keyup", searchPeople);
        document.getElementById("teacher.fullname").addEventListener("change", setPerson);
        document.getElementById("event_uuid").addEventListener("change", setSupervisor);

        document.getElementById("examadd").addEventListener("click", addExam);
    }
    addDetailsAllToggle("showDetails", "examlist");

    searchExamlist();
});


/**
 * search people
 * @param event the calling event
 */
function searchPeople(event) {
    clearTimeout(peopleDelay);
    if (event.keyCode < 37 || event.keyCode > 40) {
        peopleDelay = setTimeout(() => {
            let fieldname = event.target.id;
            let filter_role = "all"
            if (fieldname === "student.fullname") filter_role = "student";
            if (fieldname === "teacher.fullname") filter_role = "teacher"
            let filter_name = document.getElementById(fieldname).value;
            if (filter_name.length >= 2) {
                loadPeople(
                    filter_name, filter_role
                ).then(data => {
                    setPeopleList(data, fieldname);
                });
            }
        }, 500);
    }
}

/**
 * updates the data list for searching people
 * @param data  a list of people
 * @param fieldname  the field to add the datalist
 */
function setPeopleList(data, fieldname) {
    let parts = fieldname.split(".");
    let datalist = document.getElementById(parts[0] + ".list");
    datalist.innerHTML = "";
    let count = 0;
    data.forEach(person => {
        let option = document.createElement("option");
        option.value = person.email;
        option.innerHTML = person.fullname;
        if (fieldname === "student.fullname") {
            option.innerHTML += " (" + person.department + ")";
        }
        datalist.appendChild(option);
        count++;
    });
    datalist.setAttribute("size", Math.min(count, 10).toString());
    document.getElementById(fieldname).focus();
}

/**
 * sets the values of the selected person
 * @param event the calling event
 */
function setPerson(event) {
    let fieldname = event.target.id;
    let parts = fieldname.split(".");
    let datalist = document.getElementById(parts[0] + ".list");
    let email = document.getElementById(fieldname).value;

    for (let i = 0; i < datalist.options.length; i++) {
        let option = datalist.options[i];
        if (option.value === email) {
            document.getElementById(parts[0]).value = email;
            document.getElementById(fieldname).value = option.text;
        }
    }
}

/**
 * shows the supervisor for the selected event
 */
function setSupervisor() {
    const field = document.getElementById("event_uuid");
    const selected = field.options[field.selectedIndex];
    document.getElementById("supervisor").value = selected.getAttribute("data-supervisor");
}

/**
 * search people with delay upon input
 * @param event
 */
function searchExamlist(event) {
    if (event) event.preventDefault();
    showMessage("info", "Lade Daten ...", 1);
    let filter = "";
    filter += "student=" + document.getElementById("studentSearch").value;
    filter += "&teacher=" + document.getElementById("teacherSearch").value;
    filter += "&date=" + document.getElementById("dateSearch").value;
    filter += "&status=" + document.getElementById("statusSearch").value;

    readExamlist(
        filter
    ).then(data => {
        showExamlist(data);
    }).catch(result => {
        console.log(result);
    });

}

/**
 * show the examlist in a table
 * @param data
 */
function showExamlist(data) {
    (async () => {
        let exists = false;
        while (!exists) {
            exists = document.readyState === "complete" && Object.keys(eventList).length !== 0;
            if (!exists)
                await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (role === "teacher") {
            document.getElementById("studentSearch").readOnly = false;
        } else {
            document.getElementById("studentSearch").readOnly = true;
        }

        let rows = document.getElementById("examlist")
            .getElementsByTagName("tbody")[0];
        rows.innerHTML = "";
        if (data !== "[]") {
            data.sort(sortExams);

            data.forEach(exam => {
                try {
                    let row = rows.insertRow(-1);
                    addTextCell(row, exam.teacher.firstname + " " + exam.teacher.lastname + "<br />" + exam.teacher.email);
                    addTextCell(row, exam.student.firstname + " " + exam.student.lastname + "<br />" + exam.student.email);
                    addTextCell(row, eventList[exam.event_uuid].timestamp.substring(0, 10));
                    addTextCell(row, statusData[exam.status].icon + statusData[exam.status].text);
                    addTextCell(row, exam.module + " / " + exam.exam_num);
                    addTextCell(row, exam.duration);

                    let cell = row.insertCell(-1);
                    let button = document.createElement("button");
                    button.innerHTML = "<span class='text-light'><i class='bi bi-pencil'></i></span>";
                    button.type = "button";
                    button.id = "editExam";
                    button.title = "Bearbeiten";
                    button.className = "btn btn-sm btn-primary ms-1";
                    button.setAttribute("data-examuuid", exam.exam_uuid);
                    button.addEventListener("click", selectExam);
                    cell.appendChild(button);

                    if (role === "teacher") {
                        button = document.createElement("button");
                        button.innerHTML = "<span class='text-light'><i class='bi bi-at'></i></span>";
                        button.type = "button";
                        button.id = "sendEmail";
                        button.title = "Sendet dem Lernenden eine Email mit den Angaben zur verpassten Prüfung und dem Nachprüfungstermin";
                        button.className = "btn btn-sm btn-primary ms-1";
                        if (exam.status < '10' || exam.status > '40') {
                            button.disabled = true;
                        }
                        button.setAttribute("data-examuuid", exam.exam_uuid);
                        button.setAttribute("data-status", exam.status);
                        button.addEventListener("click", sendEmail);
                        cell.appendChild(button);
                        button = document.createElement("button");
                        button.innerHTML = "<span class='text-light'><i class='bi bi-file-earmark-pdf'></i></span>";
                        button.type = "button";
                        button.id = "createPDF";
                        button.title = "Deckblatt für Prüfungsunterlagen ausdrucken";
                        button.className = "btn btn-sm btn-primary ms-1";
                        button.setAttribute("data-examuuid", exam.exam_uuid);
                        button.addEventListener("click", createPDF);
                        cell.appendChild(button);

                        button = document.createElement("button");
                        button.innerHTML = "<span class='text-light'><i class='bi bi-stickies-fill'></i></span>";
                        button.type = "button";
                        button.id = "copyExam";
                        button.title = "Kopie erstellen";
                        button.className = "btn btn-sm btn-primary ms-1";
                        button.setAttribute("data-examuuid", exam.exam_uuid);
                        button.addEventListener("click", copyExam);
                        cell.appendChild(button);
                    }

                    const detailRow = addDetailRow(rows, exam, 7);
                    addDetailToggle(cell, detailRow);

                } catch (error) {
                    console.log("Error in exam with uuid: " + exam.exam_uuid);
                }
            });
            setDetailsAllButton("showDetails", false);
            showMessage("clear", "");
        } else {
            showMessage("warning", "Keine Prüfungen zu diesen Suchkriterien gefunden");
        }
    })();
}

/**
 * compares to exams
 * @param examA
 * @param examB
 * @returns compare result
 */
function sortExams(examA, examB) {
    try {
        const dateA = eventList[examA.event_uuid].datetime;
        const dateB = eventList[examB.event_uuid].datetime;
        if (dateA < dateB) {
            return -1;
        }
        if (dateA > dateB) {
            return 1;
        }

        const compare = examA.student.lastname.toString().localeCompare(examB.student.lastname.toString());
        if (compare !== 0) return compare;
        return examA.student.firstname.localeCompare(examB.student.firstname);
    } catch (e) {
        return 0;
    }

}

/**
 * opens the editform to add a new exam
 */
function addExam() {

    const editForm = document.getElementById("editform");
    editForm.reset();
    editForm.classList.remove("d-none");
    document.getElementById("list").classList.add("d-none");
    setSupervisor();
    document.getElementById("sendexam").checked = true;

}

/**
 * event that fires to create a copy of an exam
 * @param event
 */
function copyExam(event) {
    selectExam(event, true);
}

/**
 * event that fires when an exam is selected
 * @param event
 * @param copy  create a copy of this exam
 */
function selectExam(event, copy = false) {
    const uuid = getExamUUID(event);
    document.getElementById("editform").classList.remove("d-none");
    document.getElementById("list").classList.add("d-none");
    readExam(
        uuid
    ).then(exam => {
        for (let property in exam) {
            if (typeof exam[property] === "object") {
                if (property === "teacher" || property === "student") {
                    document.getElementById(property + ".fullname").value = exam[property].fullname;
                    document.getElementById(property).value = exam[property].email;
                }
            } else {
                const field = document.getElementById(property);
                if (field !== null) {
                    const value = exam[property].toString();
                    field.value = value.replaceAll("CRLF", "\n");
                }
            }
        }
        if (copy) {
            document.getElementById("exam_uuid").value = "";
            document.getElementById("student.fullname").value = "";
            document.getElementById("student").value = "";
            document.getElementById("status").value = 0;
            document.getElementById("room").value = "";
            document.getElementById("sendexam").checked = true;
        } else {
            document.getElementById("sendexam").checked = false;
        }
        setSupervisor();
        document.getElementById("student.fullname").focus();
    }).catch(status => {
        showMessage("danger", "Ein Fehler ist aufgetreten");
    });
}

/**
 * submits the changes to the exam
 * @param event
 */
function submitExam(event) {
    event.preventDefault();
    const examForm = document.getElementById("editform");
    if (examForm.checkValidity()) {
        const fields = [
            "exam_uuid",
            "event_uuid",
            "student",
            "teacher",
            "cohort",
            "module",
            "exam_num",
            "missed",
            "duration",
            "room",
            "status",
            "tools",
            "remarks"
        ];
        let data = new URLSearchParams();
        for (let field of fields) {
            data.set(field, document.getElementById(field).value);
        }

        saveExam(
            data
        ).then(function () {
            if (document.getElementById("sendexam").checked) {
                const uuid = document.getElementById('exam_uuid').value;
                const status = document.getElementById('status').value;
                sendRequest(
                    API_URL + "/email/" + uuid + "/" + status
                ).then(showMessage("info", "Email gesendet"));
            }
            document.getElementById("editform").classList.add("d-none");
            document.getElementById("list").classList.remove("d-none");
            searchExamlist();
        }).catch(result => {
            if (result === "400") {
                showMessage("danger", "Daten ungültig oder unvollständig")
            } else {
                showMessage("danger", "Allgemeiner Fehler beim Speichern")
            }
            console.log(result)
        });
    }
}

/**
 * resets and closes the edit form
 */
function resetForm() {
    document.getElementById("editform").classList.add("d-none");
    document.getElementById("editform").reset();
    document.getElementById("list").classList.remove("d-none");
    document.getElementById("exam_uuid").value = ""
    document.getElementById("teacher").value = ""
    document.getElementById("student").value = ""
    document.getElementById("examlist").focus();
}


/**
 * event that fires when sendEmail is selected
 * @param event
 */
function sendEmail(event) {
    const uuid = getExamUUID(event);
    const status = getStatus(event);

    sendRequest(
        API_URL + "/email/" + uuid + "/" + status
    ).then(showMessage("info", "Email gesendet"));
}

/**
 * creates a pdf for an event
 * @param event
 */
function createPDF(event) {
    const uuid = getExamUUID(event)
    sendRequest(API_URL + "/print/" + uuid, "GET", null, "blob")
        .then((blob) => {
            const _url = window.URL.createObjectURL(blob);
            window.open(_url, "_blank").focus();
        }).catch((err) => {
        console.log(err);
    });
}