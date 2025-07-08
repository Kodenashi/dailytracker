import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC1tFG-E4XrGCDms5cdfyBtuo5s8D-d7og",
    authDomain: "dailytracker-f9522.firebaseapp.com",
    projectId: "dailytracker-f9522",
    storageBucket: "dailytracker-f9522.appspot.com",
    messagingSenderId: "715369191108",
    appId: "1:715369191108:web:3201329bfaddf4dd3e1b91",
    measurementId: "G-S27WN4XM5K"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const entriesRef = collection(db, "call_tracker");

// Load entries
async function loadEntries() {
    const snapshot = await getDocs(entriesRef);
    const entries = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        entries.push({
            id: docSnap.id,
            ...data
        });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    document.getElementById("tableBody").innerHTML = "";

    entries.forEach(entry => {
        addRowToTable(entry.id, entry.date, entry.calls, entry.surveys, entry.percentage, entry.surveyScore, entry.revenue || 0);
    });

    updateTotals();
}

// Add to Firestore
async function addEntryToFirestore(date, calls, surveys, percentage, surveyScore, revenue) {
    const docRef = await addDoc(entriesRef, {
        date,
        calls,
        surveys,
        percentage,
        surveyScore,
        revenue
    });
    addRowToTable(docRef.id, date, calls, surveys, percentage, surveyScore, revenue);
    updateTotals();
}

// Add entry button
window.addEntry = async function () {
    const date = document.getElementById("dateInput").value;
    const calls = parseInt(document.getElementById("callsInput").value);
    const surveys = parseInt(document.getElementById("surveysInput").value);
    const surveyTotal = parseFloat(document.getElementById("surveyTotalInput").value);
    const revenue = parseFloat(document.getElementById("revenueInput").value) || 0;

    if (!date || isNaN(calls) || isNaN(surveys) || isNaN(surveyTotal)) {
        alert("Please enter all fields correctly.");
        return;
    }

    const percentage = ((surveys / calls) * 100).toFixed(2);
    const perfectScore = surveys * 5;
    const surveyScore = perfectScore > 0 ? ((surveyTotal / perfectScore) * 100).toFixed(2) : "0.00";

    await addEntryToFirestore(date, calls, surveys, percentage, surveyScore, revenue);
    document.getElementById("trackerForm").reset();
    await loadEntries();
};

// Delete row
window.deleteRow = async function (button) {
    const row = button.closest("tr");
    const entryId = row.dataset.id;
    await deleteDoc(doc(db, "call_tracker", entryId));
    row.remove();
    updateTotals();
};

// Edit row
window.editRow = function (button) {
    const row = button.closest("tr");
    const id = row.dataset.id;

    const date = row.cells[0].textContent;
    const calls = parseInt(row.cells[1].textContent);
    const surveys = parseInt(row.cells[2].textContent);
    const percentage = row.cells[3].textContent;
    const surveyScore = row.cells[4].textContent;
    const revenue = row.cells[5].textContent;

    const surveyTotal = ((parseFloat(surveyScore.replace('%', '')) / 100) * (surveys * 5)).toFixed(2);
    const revenueValue = parseFloat(revenue.replace('$', ''));

    const originalHTML = row.innerHTML;

    row.classList.add('edit-fade');
    row.classList.remove('show');

    setTimeout(() => {
        row.innerHTML = `
        <td>${date}</td>
        <td><input type="number" id="editCalls" value="${calls}" /></td>
        <td><input type="number" id="editSurveys" value="${surveys}" /></td>
        <td>-</td>
        <td><input type="number" id="editSurveyTotal" value="${surveyTotal}" step="0.01" /></td>
        <td><input type="number" id="editRevenue" value="${revenueValue}" step="0.01" /></td>
        <td>
            <button onclick="saveEdit(this, '${id}', '${date}')">Save</button>
            <button onclick="cancelEdit(this)">Cancel</button>
        </td>
      `;
        row.dataset.original = originalHTML;
        void row.offsetWidth;
        row.classList.add('show');
    }, 150);
};

window.cancelEdit = function (button) {
    const row = button.closest("tr");
    if (row.dataset.original) {
        row.classList.remove('show');
        setTimeout(() => {
            row.innerHTML = row.dataset.original;
            delete row.dataset.original;
            void row.offsetWidth;
            row.classList.add('show');
        }, 150);
    }
};

// Save edits
window.saveEdit = async function (button, id, date) {
    const row = button.closest("tr");
    const calls = parseInt(row.querySelector("#editCalls").value);
    const surveys = parseInt(row.querySelector("#editSurveys").value);
    const surveyTotal = parseFloat(row.querySelector("#editSurveyTotal").value);
    const revenue = parseFloat(row.querySelector("#editRevenue").value) || 0;

    if (isNaN(calls) || isNaN(surveys) || isNaN(surveyTotal)) {
        alert("Please enter valid numbers.");
        return;
    }

    const percentage = ((surveys / calls) * 100).toFixed(2);
    const perfectScore = surveys * 5;
    const surveyScore = perfectScore > 0 ? ((surveyTotal / perfectScore) * 100).toFixed(2) : "0.00";

    await setDoc(doc(db, "call_tracker", id), {
        date,
        calls,
        surveys,
        percentage,
        surveyScore,
        revenue
    });

    await loadEntries();
};

// Remove all
window.removeAll = async function () {
    if (!confirm("Are you sure you want to remove all entries?")) return;
    const snapshot = await getDocs(entriesRef);
    const deletes = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletes);
    document.getElementById("tableBody").innerHTML = "";
    updateTotals();
};

// Add row to table
function addRowToTable(id, date, calls, surveys, percentage, surveyScore, revenue) {
    const tableBody = document.getElementById("tableBody");
    const row = document.createElement("tr");
    row.className = 'edit-fade show';
    row.dataset.id = id;
    row.innerHTML = `
      <td>${date}</td>
      <td>${calls}</td>
      <td>${surveys}</td>
      <td>${percentage}%</td>
      <td>${surveyScore}%</td>
      <td>$${parseFloat(revenue).toFixed(2)}</td>
      <td>
        <button onclick="editRow(this)">Edit</button>
        <button onclick="deleteRow(this)">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
}

// Update totals
function updateTotals() {
    const rows = document.querySelectorAll("#tableBody tr");
    let totalCalls = 0, totalSurveys = 0, totalRevenue = 0;
    let totalSurveyScore = 0, scoreCount = 0;

    rows.forEach(row => {
        const calls = parseInt(row.cells[1].textContent) || 0;
        const surveys = parseInt(row.cells[2].textContent) || 0;
        const surveyScore = parseFloat(row.cells[4].textContent.replace('%', '')) || 0;
        const revenue = parseFloat(row.cells[5].textContent.replace('$', '')) || 0;

        totalCalls += calls;
        totalSurveys += surveys;
        totalRevenue += revenue;

        if (!isNaN(surveyScore)) {
            totalSurveyScore += surveyScore;
            scoreCount++;
        }
    });

    const totalPercentage = totalCalls ? ((totalSurveys / totalCalls) * 100).toFixed(2) : "0.00";
    const averageSurveyScore = scoreCount ? (totalSurveyScore / scoreCount).toFixed(2) : "0.00";
    const revenuePerCall = totalCalls ? (totalRevenue / totalCalls).toFixed(2) : "0.00";

    document.getElementById("totalCalls").textContent = totalCalls;
    document.getElementById("totalSurveys").textContent = totalSurveys;
    document.getElementById("totalPercentage").textContent = `${totalPercentage}%`;
    document.getElementById("averageSurveyScore").textContent = `${averageSurveyScore}%`;
    document.getElementById("totalRevenuePerCall").textContent = `$${revenuePerCall}`;
}

// Excel export
window.exportToExcel = function () {
    const table = document.getElementById("trackerTable");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Call Tracker" });
    XLSX.writeFile(wb, "Daily_Call_EOC_Tracker.xlsx");
};

// Form listener
document.getElementById("trackerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    window.addEntry();
});

// Initial load
window.addEventListener("DOMContentLoaded", loadEntries);
