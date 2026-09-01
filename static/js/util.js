/**
 * utility functions
 * @author Marcel Suter
 */

const user = readStorage("email");
const role = readStorage("role");
const statusData = {
    "10": {
        "text": "pendent",
        "icon": "<span class='text-warning'><i class='bi bi-exclamation-triangle-fill'></i>&nbsp;</span>"
    },
    "20": {"text": "offen", "icon": "<span class='text-warning'><i class='bi bi-info-square-fill'></i>&nbsp;</span>"},
    "30": {
        "text": "abgegeben",
        "icon": "<span class='text-primary'><i class='bi bi-envelope-paper-fill'></i>&nbsp;</span>"
    },
    "35": {
        "text": "elektronisch",
        "icon": "<span class='text-primary'><i class='bi bi-window-stack'></i>&nbsp;</span>"
    },
    "40": {
        "text": "erhalten",
        "icon": "<span class='text-primary'><i class='bi bi-envelope-check-fill'></i>&nbsp;</span>"
    },
    "50": {
        "text": "absolviert",
        "icon": "<span class='text-success'><i class='bi bi-check-circle-fill'></i>&nbsp;</span>"
    },
    "80": {"text": "pnab", "icon": "<span class='text-danger'><i class='bi bi-x-octagon-fill'></i>&nbsp;</span>"},
    "90": {"text": "gelöscht", "icon": "<span class='text-danger'><i class='bi bi-trash3-fill'></i>&nbsp;</span>"}
}

let messageTimer;
let running = false;

/**
 * controls the fetch requests, refreshes the access-token if needed
 * @param url  the request URL
 * @param method the http-method
 * @param bodyData  the data to send (POST/PUT only)
 * @param type  the type of the response
 * @returns {Promise<unknown>}
 */
async function sendRequest(url, method = "GET", bodyData = null, type = "json") {
    let reason = "";
    try {
        let result = await httpFetch(url, method, bodyData, "access", type);
        if (
            result.status === "404" &&
            (method === "PUT" || method === "POST")
        ) {
            return Promise.reject("404");
        } else {
            return Promise.resolve(result);
        }
    } catch (err) {
        console.log(err);
        reason = err;
    }

    if (reason === "401") {
        try {
            let data = await httpFetch(API_URL + '/refresh/' + user, "GET", null, "refresh");
            writeStorage(data);
            let result = await httpFetch(url, method, bodyData, "access", type);
            return Promise.resolve(result);
        } catch (err) {
            console.log("sendRequest: " + err);
            reason = err;
        }
    }

    if (reason === "401") {
        window.location.href = "./";
    }
    return Promise.reject(reason);
}

/**
 * executes the http fetch and returns a promise
 * @param url  the fetch-url
 * @param httpMethod  the http-methode
 * @param data    the data to be sent (PUT/POST only)
 * @param token  which token to send (access or refresh)
 * @param type  type of the response data
 * @returns {Promise<string|any>}
 */
async function httpFetch(
    url,
    httpMethod = "GET",
    data = null,
    token = "access",
    type = "json"
) {

    try {
        let response;
        if (httpMethod === "PUT" || httpMethod === "POST") {
            response = await fetch(url, {
                method: httpMethod,
                headers: {
                    "Authorization": "Bearer " + readStorage(token)
                },
                body: data
            });
        } else {
            response = await fetch(url, {
                method: httpMethod,
                headers: {
                    "Authorization": "Bearer " + readStorage(token)
                }
            });
        }
        if (response.ok) {
            if (type === "json")
                data = response.json();
            else if (type === "blob")
                data = response.blob();
            else
                data = response.text();
            return Promise.resolve(data);
        } else if (response.status === 401) {
            return Promise.reject("401");
        } else if (response.status === 404) {
            return Promise.resolve("[]");
        } else {
            console.log(response);
            return Promise.reject(response.status);
        }
    } catch (err) {
        console.log(err);
        return Promise.reject(err.status);
    }
}

/**
 * shows a info/warn/error-message
 * @param type  message type: info, success, danger, warning
 * @param message the message to show
 * @param minTime  the minimum time this message should be shown in seconds
 * @param timeout  removes the message after this time in seconds
 */
function showMessage(type, message = "", minTime = 0, timeout = 0) {
    const field = document.getElementById("messages");

    if (type === "clear") {
        if (running) {
            setTimeout(() => {
                showMessage("clear", "&nbsp;", 2);
            })
        } else {
            clearTimeout(messageTimer);
            field.className = "alert";
            field.innerHTML = "&nbsp;";
        }
    } else {
        field.className = "alert-" + type;
        field.innerHTML = message;

        if (timeout > 0) {
            messageTimer = setTimeout(() => {
                showMessage("clear", "&nbsp;");
            }, timeout * 1000);
        } else if (minTime > 0) {
            running = true;
            messageTimer = setTimeout(() => {
                running = false;
            }, minTime * 1000);
        }
    }
}

/**
 * locks / unlocks all fields in a form
 * @param formId  the id of the form containing the fields
 * @param locked  true=lock fields
 */
function lockForm(formId, locked = true) {
    const form = document.getElementById(formId);
    const fields = form.querySelectorAll("select,input");
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field.type === "hidden" ||
            field.getAttribute("data-edit") === "all") ;
        else if (field.tagName === "INPUT") {
            field.disabled = locked;
        } else if (field.tagName === "SELECT") {
            field.disabled = locked;
        }

    }
}

/**
 * saves the JWToken in SessionStorage
 * @param data  response data
 */

function writeStorage(data) {
    for (let key in data) {
        sessionStorage.setItem(key, data[key]);
    }
}

/**
 * reads the JWToken from SessionStorage
 * @returns {string}
 */
function readStorage(item) {
    return sessionStorage.getItem(item);
}

/**
 * gets the examuuid from a button
 * @param event
 * @returns {string}
 */
function getExamUUID(event) {
    let targetElement = event.target;
    if (targetElement.tagName === "I") {
        targetElement = targetElement.parentNode.parentNode;
    }
    return targetElement.getAttribute("data-examuuid");
}

/**
 * gets the status from a button
 * @param event
 * @returns {string}
 */
function getStatus(event) {
    let targetElement = event.target;
    if (targetElement.tagName === "IMG") {
        targetElement = targetElement.parentNode;
    } else if (targetElement.tagName === "I") {
        targetElement = targetElement.parentNode.parentNode;
    }
    return targetElement.getAttribute("data-status");
}

/**
 * creates a uuid v4
 * @returns {string}
 */
function create_UUID() {
    let dt = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

/* the additional fields shown when a row of an examlist is expanded */
const DETAIL_FIELDS = [
    {"label": "Verpasste Prüfung", "value": exam => formatDate(exam.missed)},
    {"label": "Raum", "value": exam => exam.room},
    {"label": "Hilfsmittel", "value": exam => exam.tools},
    {"label": "Anmerkungen", "value": exam => exam.remarks}
];

/**
 * formats a date of the API (yyyy-mm-dd) for display
 * @param value  the date as delivered by the API
 * @returns {string} the date as dd.mm.yyyy
 */
function formatDate(value) {
    if (value === null || value === undefined || value === "") return "";
    const parts = value.toString().substring(0, 10).split("-");
    if (parts.length !== 3) return value.toString();
    return parts[2] + "." + parts[1] + "." + parts[0];
}

/**
 * turns a stored text into a readable one.
 * Line breaks are stored as the marker CRLF, see ExamDAO.save_exams()
 * @param value  the stored text
 * @returns {string} the text with real line breaks
 */
function plainText(value) {
    if (value === null || value === undefined) return "";
    return value.toString().replaceAll("CRLF", "\n");
}

/**
 * adds the hidden row that holds the additional information about an exam
 * @param rows  the tbody of the examlist
 * @param exam  the exam to describe
 * @param colspan  the number of columns of the examlist
 * @returns {HTMLTableRowElement} the new row
 */
function addDetailRow(rows, exam, colspan) {
    const row = rows.insertRow(-1);
    row.classList.add("exam-details", "d-none");
    const cell = row.insertCell(-1);
    cell.colSpan = colspan;

    const list = document.createElement("dl");
    list.classList.add("row", "mb-0");
    DETAIL_FIELDS.forEach(field => {
        const text = plainText(field.value(exam)).trim();
        const label = document.createElement("dt");
        label.classList.add("col-sm-2");
        label.textContent = field.label;
        const value = document.createElement("dd");
        value.classList.add("col-sm-10", "mb-1", "exam-details-text");
        value.textContent = text === "" ? "—" : text;
        list.appendChild(label);
        list.appendChild(value);
    });
    cell.appendChild(list);
    return row;
}

/**
 * adds the button that shows or hides the details of a single exam
 * @param cell  the cell to add the button to
 * @param detailRow  the row with the details
 * @returns {HTMLButtonElement} the new button
 */
function addDetailToggle(cell, detailRow) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-outline-primary ms-1 exam-details-toggle";
    button.setAttribute("aria-expanded", "false");
    setDetails(detailRow, button, false);
    button.addEventListener("click", () => {
        setDetails(detailRow, button, detailRow.classList.contains("d-none"));
    });
    cell.appendChild(button);
    return button;
}

/**
 * shows or hides the details of one exam
 * @param detailRow  the row with the details
 * @param button  the button that toggles the row
 * @param show  true=show the details
 */
function setDetails(detailRow, button, show) {
    const label = show ? "Weitere Angaben ausblenden" : "Weitere Angaben anzeigen";
    detailRow.classList.toggle("d-none", !show);
    button.setAttribute("aria-expanded", show ? "true" : "false");
    button.title = label;
    // der Knopf zeigt nur ein Icon, ohne aria-label hat er keinen
    // verlaesslichen Namen fuer Screenreader
    button.setAttribute("aria-label", label);
    button.innerHTML = show
        ? "<i class='bi bi-chevron-up'></i>"
        : "<i class='bi bi-chevron-down'></i>";
}

/**
 * shows or hides the details of every exam in a list
 * @param tableId  the id of the examlist
 * @param show  true=show all details
 */
function setAllDetails(tableId, show) {
    const table = document.getElementById(tableId);
    table.querySelectorAll("tr.exam-details").forEach(detailRow => {
        const button = detailRow.previousElementSibling.querySelector(".exam-details-toggle");
        if (button !== null) setDetails(detailRow, button, show);
    });
}

/**
 * connects the button that shows or hides the details of all exams at once
 * @param buttonId  the id of the button
 * @param tableId  the id of the examlist
 */
function addDetailsAllToggle(buttonId, tableId) {
    const button = document.getElementById(buttonId);
    if (button === null) return;
    if (button.getAttribute("data-shown") !== null) return;   // already connected
    button.addEventListener("click", () => {
        const show = button.getAttribute("data-shown") !== "true";
        setAllDetails(tableId, show);
        setDetailsAllButton(buttonId, show);
    });
    setDetailsAllButton(buttonId, false);
}

/**
 * updates the label of the button that shows or hides all details
 * @param buttonId  the id of the button
 * @param show  true=details are shown
 */
function setDetailsAllButton(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (button === null) return;
    button.setAttribute("data-shown", show ? "true" : "false");
    button.setAttribute("aria-expanded", show ? "true" : "false");
    button.innerHTML = show
        ? "<i class='bi bi-chevron-up'></i> Weniger anzeigen"
        : "<i class='bi bi-chevron-down'></i> Mehr anzeigen";
}

function addTextCell(row, text) {
    /**
     * adds a cell to a table row
     * @param row  a row-object
     * @param text the innerHtml-text
     */
    let cell = row.insertCell(-1);
    cell.innerHTML = text;
}