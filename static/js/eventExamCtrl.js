/**
 * controller for eventExam.html
 */

/* initialize */
readEventList(["dateSearch"]);

/* main listener */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("selectAll").checked = false;
    if (role !== "teacher") {
        window.location.href = "./";
    } else {
        document.getElementById("dateSearch").addEventListener("change", searchExamlist);
        document.getElementById("selectAll").addEventListener("change", selectAll);
        document.getElementById("sendEmail").addEventListener("click", sendInvitation);
        document.getElementById("eventStatus").addEventListener("change", changeStatus);
        // document.getElementById("sendReminder").addEventListener("click", sendReminder);  TODO Version 1.2
        document.getElementById("createPDF").addEventListener("click", createAllPDF);
        document.getElementById("student").addEventListener("click", changeSort);
        document.getElementById("status").addEventListener("click", changeSort);
        addDetailsAllToggle("showDetails", "examlist");
    }
});

/**
 * Search all exams filtered by the selected date
 */
function searchExamlist() {
    showMessage("info", "wird geladen", 2);
    const select = document.getElementById("dateSearch");
    const filter = "&date=" + select.value;
    writeStorage({"event_uuid": select.value});
    const option = select.options[select.selectedIndex];
    const locked = option.getAttribute("data-locked") === "true";
    const eventStatus = option.getAttribute("data-eventStatus");

    document.getElementById("email").innerText = option.getAttribute("data-supervisor");
    document.getElementById("sendEmail").disabled = true;
    if (eventStatus === "closed") {
        document.getElementById("sendEmail").disabled = locked;
    }
    document.getElementById("createPDF").disabled = locked;
    show_eventStatus(eventStatus);
    readExamlist(filter).then(data => {
        showExamlist(data, locked);
    }).catch(result => {
        console.log(result);
    });
}

function show_eventStatus(eventStatus) {
    /**
     * Shows the event status
     */

    const statusSwitch = document.getElementById("eventStatus");
    const statusLabel = document.getElementById("eventStatusLabel");
    const sendEmail = document.getElementById("sendEmail");

    if (eventStatus === "closed") {
        statusLabel.innerText = "geschlossen";
        statusSwitch.checked = false;
        statusSwitch.disabled = false;
        sendEmail.disabled = false;
    } else if (eventStatus === "finished") {
        statusLabel.innerText = "beendet";
        statusSwitch.checked = false;
        statusSwitch.disabled = true;
        sendEmail.disabled = true;
    } else if (eventStatus === "open") {
        statusLabel.innerText = "offen";
        statusSwitch.checked = true;
        statusSwitch.disabled = false;
        sendEmail.disabled = true;
    } else {
        statusLabel.innerText = "offen";
        statusSwitch.checked = true;
        statusSwitch.disabled = false;
        sendEmail.disabled = true;
    }

}

function changeStatus() {
    /**
     * Changes the event status
     */
    showMessage("info", "wird gespeichert", 2);
    let data = new URLSearchParams();
    const select = document.getElementById("dateSearch");
    data.set("event_uuid", select.value);
    data.set("status", document.getElementById("eventStatus").checked ? "open" : "closed");
    saveEvent(
        data
    ).then(() => {
        show_eventStatus(data.get("status"));
        showMessage("clear", "");
    }).catch(reason => {
        console.log(reason);
        if (reason === "404") {
            showMessage("danger", "Beim Speichern ist ein Fehler aufgetreten. Bitte probiere es später nocheinmal.");
        }
    });
}
function changeSort(event) {
    /**
     * Changes the sort order
     * @param event the event calling this function
     */
    const urlParams = new URLSearchParams(window.location.search);
    let fieldId = event.target.id;
    if (fieldId === "status") {
        urlParams.set("sort", "status");
        document.getElementById('statusArrow').innerHTML = '&blacktriangle;&nbsp;';
        document.getElementById('studentArrow').innerText = '';
    } else {
        urlParams.set("sort", "name");
        document.getElementById('statusArrow').innerText = '';
        document.getElementById('studentArrow').innerHTML = '&blacktriangle;&nbsp;';
    }
    let newURL = location.protocol + '//' + location.host + location.pathname + "?" + urlParams.toString();
    history.pushState(null, null, newURL);
    searchExamlist();

}

/**
 * show the examlist in a table
 * @param data
 * @param locked
 */
function showExamlist(data, locked) {
    (async () => {
        let exists = false;
        while (!exists) {
            exists = document.readyState === "complete" && Object.keys(eventList).length !== 0;
            if (!exists) await new Promise(resolve => setTimeout(resolve, 100));
        }
        let rows = document.getElementById("examlist")
            .getElementsByTagName("tbody")[0];
        rows.innerHTML = "";
        if (data !== "[]") {
            let sortField = "status";
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("sort")) {
                sortField = urlParams.get("sort");
            }

            data.sort(sortExams(sortField));
            let prevEmail = "";
            let count = 0;
            let distinctStudent = {};
            data.forEach(exam => {
                if (exam.status !== "90") {
                    try {
                        let row = rows.insertRow(-1);
                        let cell = row.insertCell(-1);
                        let field = document.createElement("input");
                        field.type = "checkbox";
                        field.name = "selected";
                        field.classList.add("form-check-input");
                        field.setAttribute("data-examUUID", exam.exam_uuid);
                        cell.appendChild(field);

                        /* cell = row.insertCell(-1);
                        if (exam.student.email !== prevEmail) {
                            prevEmail = exam.student.email;
                            count++;
                            cell.innerText = count.toString();
                            distinctStudent[exam.student.email] = 1;
                        } */
                        distinctStudent[exam.student.email] = 1;
                        cell = row.insertCell(-1);
                        let dropdown = document.createElement("select");
                        dropdown.setAttribute("data-examUUID", exam.exam_uuid);
                        dropdown.addEventListener("change", changeExam);
                        dropdown.classList.add("form-select");
                        addOptions(dropdown);
                        dropdown.value = exam.status;
                        dropdown.name = "status";
                        cell.appendChild(dropdown);

                        cell = row.insertCell(-1);
                        field = document.createElement("i");
                        if (exam.invited) {
                            field.classList.add("bi", "bi-check-lg");
                        } else {
                            field.classList.add("bi", "bi-x-lg");
                        }
                        cell.appendChild(field);
                        cell = row.insertCell(-1);

                        field = document.createElement("input");
                        field.value = exam.room;
                        field.name = "room";
                        field.size = 8;
                        field.setAttribute("data-examUUID", exam.exam_uuid);
                        field.addEventListener("change", changeExam);
                        cell.appendChild(field);
                        cell = row.insertCell(-1);
                        cell.innerHTML = exam.student.firstname + " " + exam.student.lastname + ", " + exam.cohort;
                        cell = row.insertCell(-1);
                        cell.innerHTML = exam.teacher.firstname + " " + exam.teacher.lastname;
                        cell = row.insertCell(-1);
                        cell.innerHTML = exam.module + " / " + exam.exam_num.substring(0, 15);
                        cell = row.insertCell(-1);
                        cell.innerHTML = exam.duration;

                        cell = row.insertCell(-1);
                        cell.classList.add("text-end");
                        const detailRow = addDetailRow(rows, exam, 9);
                        addDetailToggle(cell, detailRow);
                    } catch (error) {
                        console.log("Error in exam with uuid: " + exam.exam_uuid);
                    }
                }
            });
            setDetailsAllButton("showDetails", false);
            document.getElementById("distinct").innerText = Object.keys(distinctStudent).length
            lockForm("filterForm", locked);
            showMessage("clear", "");
        } else {
            showMessage("warning", "Keine Prüfungen zu diesem Datum gefunden");
        }
    })();
}

/**
 * saves changes to an exam
 * @param event
 */
function changeExam(event) {
    showMessage("info", "wird gespeichert", 2);
    let examUUID = event.target.getAttribute('data-examUUID');
    let data = new URLSearchParams();
    data.set('exam_uuid', examUUID);
    let fieldname = event.target.name;
    data.set(fieldname, event.target.value);
    saveExam(data)
        .then(showMessage("clear", ""))
        .catch(reason => {
            console.log(reason);
            if (reason === "404") {
                showMessage("danger", "Beim Speichern ist ein Fehler aufgetreten. Bitte probiere es später nocheinmal.");
            }
        });
}

/**
 * adds options to the status dropdown
 * @param field  id of the element
 */
function addOptions(field) {
    for (const [key, value] of Object.entries(statusData)) {
        let option = document.createElement("option");
        option.value = key;
        option.innerHTML = value.text;
        field.appendChild(option);
    }
}


/**
 * compares two exams
 * @param property  the sort field
 * @param examA
 * @param examB
 * @returns compare result
 */
function sortExams(property) {
    return function (examA, examB) {
        if (property === "name") {
            const compareFirst = examA.student.firstname.localeCompare(examB.student.firstname);
            if (compareFirst !== 0) return compareFirst;

            const compareLast = examA.student.lastname.toString().localeCompare(examB.student.lastname.toString());
            if (compareLast !== 0) return compareLast;
            return
        }
        if (examA.status < examB.status) return -1;
        if (examA.status > examB.status) return 1;
        if (examA.room < examB.room) return -1;
        if (examA.room > examB.room) return 1;

        const compare = examA.student.lastname.toString().localeCompare(examB.student.lastname.toString());
        if (compare !== 0) return compare;
        return examA.student.firstname.localeCompare(examB.student.firstname);
    }
}

/**
 * sends an email for all selected exams
 * @param service  the api service to call
 */
function sendAllEmail(service) {
    showMessage("info", "Sende Emails ...", 2);
    let data = new URLSearchParams();
    const boxes = document.querySelectorAll("input:checked");
    if (boxes.length > 0) {
        for (const box of boxes) {
            if (box.hasAttribute("data-examuuid")) {
                data.append("exam_uuid", box.getAttribute("data-examuuid"));
            }
        }
        fetch(API_URL + service, {
            method: "PUT",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Bearer " + readStorage("access")
            }, body: data
        }).then(function (response) {
            if (!response.ok) {
                console.log(response);
            } else return response;
        }).then(response => response.text()
        ).then(pdf_name => {
            showMessage("clear", "")
        }).catch(function (error) {
            console.log(error);
        });
    } else {
        showMessage("warning", "keine Prüfung ausgewählt");
    }
}

/**
 * sends an invitiation email for all selected exams
 */
function sendInvitation() {
    sendAllEmail("/email/invitation");
}

/**
 * sends a reminder email for all selected exams
 */
function sendReminder() {
    sendAllEmail("/email/reminder")
}

/**
 * creates a PDF for all selected exams
 */
function createAllPDF() {
    showMessage("info", "PDF wird erstellt ...", 2);
    let data = new URLSearchParams();
    const boxes = document.querySelectorAll("input:checked");
    if (boxes.length > 0) {
        for (const box of boxes) {
            let examUUID = box.getAttribute("data-examuuid");
            if (examUUID != null)
                data.append("exam_uuid", examUUID);
        }
        fetch(API_URL + "/print", {
            method: "PUT",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Bearer " + readStorage("access")
            }, body: data
        }).then(function (response) {
            if (!response.ok) {
                console.log(response);
            } else return response;
        }).then(response => response.text()
        ).then(pdf_name => {
            let url = "./output/" + pdf_name;
            window.open(url, "_blank");
            showMessage("clear", "")
        }).catch(function (error) {
            console.log(error);
        });
    } else {
        showMessage("warning", "keine Prüfung ausgewählt");
    }
}

/**
 * select all / no exams
 */
function selectAll() {
    const isChecked = document.getElementById("selectAll").checked;
    const checkboxes = document.querySelectorAll("[name='selected']");
    for (const box of checkboxes) {
        box.checked = isChecked;
    }
}