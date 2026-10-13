
let salary = Number(localStorage.getItem("salary")) || 0;
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let rate = 1, currency = "INR", chart;

const $ = id => document.getElementById(id);

function total() {
  return expenses.reduce((sum, item) => sum + item.amount, 0);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency
  }).format(value * rate);
}

function save() {
  localStorage.setItem("salary", salary);
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function message(text) {
  $("message").textContent = text;
  $("message").classList.toggle("d-none", !text);
}

function render() {
  let balance = salary - total();

  $("salary").textContent = money(salary);
  $("total").textContent = money(total());
  $("balance").textContent = money(balance);

  $("balance").style.color =
    salary > 0 && balance < salary * 0.1 ? "red" : "";

  if (salary > 0 && balance < salary * 0.1) {
    message("Warning: Less than 10% of your salary remains!");
  } else {
    message("");
  }

  $("list").replaceChildren();

  expenses.forEach(item => {
    let li = document.createElement("li");
    li.className = "list-group-item";

    let name = document.createElement("span");
    name.className = "expense-name";
    name.textContent = item.name + " - " + money(item.amount);

    let btn = document.createElement("button");
    btn.className = "delete";
    btn.textContent = "Delete";
    btn.setAttribute("aria-label", "Delete " + item.name);

    btn.onclick = () => {
      expenses = expenses.filter(e => e.id !== item.id);
      save();
      render();
    };

    li.append(name, btn);
    $("list").append(li);
  });

  if (chart) chart.destroy();

  chart = new Chart($("chart"), {
    type: "pie",
    data: {
      labels: ["Remaining Balance", "Expenses"],
      datasets: [{
        data: [Math.max(balance, 0), total()],
        backgroundColor: ["#45a879", "#e58b65"]
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

$("salaryForm").onsubmit = e => {
  e.preventDefault();
  let value = $("salaryInput").value;

  if (value.trim() === "" || !Number.isFinite(Number(value)) ||
      Number(value) <= 0) {
    return message("Enter a valid salary greater than zero.");
  }

  salary = Number(value);
  $("salaryInput").value = "";
  save();
  render();
};

$("expenseForm").onsubmit = e => {
  e.preventDefault();

  let name = $("name").value.trim();
  let value = $("amount").value;
  let amount = Number(value);

  if (!name || value.trim() === "" ||
      !Number.isFinite(amount) || amount <= 0) {
    return message("Enter a name and a valid amount greater than zero.");
  }

  expenses.push({
    id: Date.now() + Math.random(),
    name,
    amount
  });

  $("expenseForm").reset();
  save();
  render();
};

$("theme").onclick = () => {
  document.body.classList.toggle("dark");

  let dark = document.body.classList.contains("dark");
  $("theme").textContent = dark ? "Light mode" : "Dark mode";

  localStorage.setItem("theme", dark ? "dark" : "light");
  render();
};

$("currency").onchange = async e => {
  let selected = e.target.value;

  if (selected === "INR") {
    currency = "INR";
    rate = 1;
    render();
    return;
  }

  e.target.disabled = true;

  try {
    let response = await fetch(
      "https://api.frankfurter.app/latest?from=INR&to=USD"
    );

    if (!response.ok) throw new Error("Request failed");

    let data = await response.json();
    if (!Number.isFinite(Number(data.rates.USD)) ||
        Number(data.rates.USD) <= 0) throw new Error("Invalid rate");

    rate = Number(data.rates.USD);
    currency = "USD";
    render();
  } catch {
    e.target.value = currency;
    message("Currency conversion failed. Try again later.");
  } finally {
    e.target.disabled = false;
  }
};

$("pdf").onclick = () => {
  if (!window.jspdf) return message("PDF library failed to load.");

  let pdf = new window.jspdf.jsPDF();

  pdf.text("Cash-Flow Expense Report", 15, 20);
  pdf.text("Salary: INR " + salary.toFixed(2), 15, 35);
  pdf.text("Expenses: INR " + total().toFixed(2), 15, 45);
  pdf.text("Balance: INR " + (salary - total()).toFixed(2), 15, 55);

  let y = 70;

  expenses.forEach((item, i) => {
    let lines = pdf.splitTextToSize(
      `${i + 1}. ${item.name} - INR ${item.amount.toFixed(2)}`, 175
    );

    if (y + lines.length * 7 > 280) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(lines, 15, y);
    y += lines.length * 7 + 2;
  });

  pdf.save("cash-flow-report.pdf");
};

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  $("theme").textContent = "Light mode";
}

render();
