/**
 * controller for eventExam.html
 */

/* exam status values where the teacher has not deposited the documents yet */
const MISSING_DOCUMENTS = ["10", "20"];

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
        document.getElementById("sendReminder").addEventListener("click", sendReminder);
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
    // bis die neue Liste steht, ist nichts ausgewaehlt, was gedruckt werden koennte
    document.getElementById("createPDF").disabled = true;
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
                        field.addEventListener("change", showSelectionButtons);
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
        // auch nach einer leeren Trefferliste, sonst bleiben die Knoepfe aus der
        // vorherigen Auswahl aktiv, obwohl keine Pruefung mehr dasteht
        showSelectionButtons();
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
 * sends an email for a list of exams
 * @param service  the api service to call
 * @param examUUIDs  the exams to send to, defaults to the selected ones
 */
function sendAllEmail(service, examUUIDs = null) {
    showMessage("info", "Sende Emails ...", 2);
    let data = new URLSearchParams();
    examUUIDs ??= selectedExams();
    if (examUUIDs.length > 0) {
        for (const examUUID of examUUIDs) {
            data.append("exam_uuid", examUUID);
        }
        fetch(API_URL + service, {
            method: "PUT",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Bearer " + readStorage("access")
            }, body: data
        }).then(response => response.text().then(message => {
            if (response.ok) {
                showMessage("info", message, 0, 5);
            } else {
                console.log(response.status, message);
                showMessage("danger", "Die Emails konnten nicht gesendet werden: "
                    + errorDetail(response.status, message));
            }
        })).catch(function (error) {
            console.log(error);
            showMessage("danger", "Die Emails konnten nicht gesendet werden");
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
 * sends a reminder email to the teachers of the selected exams whose
 * documents are still missing
 */
function sendReminder() {
    const selected = selectedExams();
    const pending = selected.filter(examUUID => MISSING_DOCUMENTS.includes(examStatus(examUUID)));

    if (pending.length === 0) {
        showMessage("warning", "Bei den ausgewählten Prüfungen fehlen keine Unterlagen");
        return;
    }
    const skipped = selected.length - pending.length;
    const question = (pending.length === 1
        ? "Bei 1 der ausgewählten Prüfungen fehlen die Unterlagen.\n\nErinnerung an die Lehrperson senden?"
        : `Bei ${pending.length} der ausgewählten Prüfungen fehlen die Unterlagen.\n\nErinnerungen an die Lehrpersonen senden?`)
        + (skipped === 0 ? "" : `\n\n${skipped} weitere Prüfung(en) bleiben unberührt, dort sind die Unterlagen da.`);
    if (!window.confirm(question)) {
        showMessage("clear", "");
        return;
    }
    sendAllEmail("/email/reminder", pending);
}

/**
 * the status of one exam, read from its dropdown in the list
 * @param examUUID  the exam to look up
 * @returns {string} the status value, empty if the exam is not in the list
 */
function examStatus(examUUID) {
    const field = document.querySelector(`#examlist select[name='status'][data-examuuid="${examUUID}"]`);
    return field === null ? "" : field.value;
}

/**
 * creates a PDF for all selected exams
 */
function createAllPDF() {
    const examUUIDs = selectedExams();
    if (examUUIDs.length === 0) {
        showMessage("warning", "keine Prüfung ausgewählt");
        return;
    }

    showMessage("info", "PDF wird erstellt ...", 2);
    let data = new URLSearchParams();
    for (const examUUID of examUUIDs) {
        data.append("exam_uuid", examUUID);
    }
    fetch(API_URL + "/print", {
        method: "PUT",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Bearer " + readStorage("access")
        }, body: data
    }).then(response => response.text().then(pdf_name => {
        if (response.ok) {
            window.open("./output/" + pdf_name, "_blank");
            showMessage("clear", "");
        } else {
            console.log(response);
            showMessage("danger", "Die Datenblätter konnten nicht erstellt werden");
        }
    })).catch(function (error) {
        console.log(error);
        showMessage("danger", "Die Datenblätter konnten nicht erstellt werden");
    });
}

/**
 * describes a failed request for the user
 * only the message field of the api is used, an arbitrary body could carry
 * markup and showMessage() writes it as innerHTML
 * @param status  the http status
 * @param body  the response body
 * @returns {string} the message of the api with the status, or just the status
 */
function errorDetail(status, body) {
    let detail = "";
    try {
        detail = JSON.parse(body).message ?? "";
    } catch (error) {
        /* not json, so there is no structured message to show */
    }
    return detail === "" ? `HTTP ${status}` : `${detail} (HTTP ${status})`;
}

/**
 * the exams whose checkbox is ticked
 * the status switch of the event is a checkbox too, so a box only counts
 * as a selection when it carries a data-examuuid
 * @returns {string[]} the uuids of the selected exams
 */
function selectedExams() {
    return [...document.querySelectorAll("input:checked")]
        .filter(box => box.hasAttribute("data-examuuid"))
        .map(box => box.getAttribute("data-examuuid"));
}

/**
 * is the selected event locked for the current user
 * @returns {boolean} true if the exams may not be changed
 */
function eventLocked() {
    const select = document.getElementById("dateSearch");
    const option = select.options[select.selectedIndex];
    return option !== undefined && option.getAttribute("data-locked") === "true";
}

/**
 * reminder and datasheets need a selection, so both buttons stay disabled
 * until at least one exam is ticked
 * a locked event keeps the datasheets disabled either way, searchExamlist()
 * sets that before the list is even loaded
 */
function showSelectionButtons() {
    const empty = selectedExams().length === 0;
    document.getElementById("sendReminder").disabled = empty;
    document.getElementById("createPDF").disabled = eventLocked() || empty;
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
    showSelectionButtons();
}