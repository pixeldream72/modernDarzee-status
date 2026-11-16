firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  projectId: "moderndarzee"
});

const params = new URLSearchParams(location.search);
const u = params.get("u");
const t = params.get("t");
const out = document.getElementById("out");

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function row(label, value, cls) {
  const r = el("div", "row" + (cls ? " " + cls : ""));
  r.appendChild(el("span", "", label));
  r.appendChild(el("span", "", value));
  return r;
}
const pkr = n => (n || 0).toLocaleString() + " PKR";
const fmt = ms => new Date(ms).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"});

function show(msg) { out.className = "msg"; out.textContent = msg; }

function render(o) {
  out.className = "";
  out.textContent = "";

  out.appendChild(el("div", "no", "Order " + (o.orderNo || "")));

  const st = (o.status || "pending").toLowerCase();
  out.appendChild(el("span", "badge " + st, st.toUpperCase()));
  const serviceStatus = ["pending", "completed", "delivered"].includes(st) ? st : "pending";

  if (o.dueDate) out.appendChild(el("div", "due", "Delivery: " + fmt(o.dueDate)));

  const customers = new Map();
  (o.services || []).forEach((s, index) => {
    const customerId = s.customer_Id == null ? "" : String(s.customer_Id);
    const customerName = s.customerName || "";
    const key = customerId ? "id:" + customerId :
                customerName ? "name:" + customerName : "service:" + index;
    if (!customers.has(key)) {
      customers.set(key, {customerId, customerName, services: []});
    }
    customers.get(key).services.push(s);
  });

  customers.forEach(customer => {
    const group = el("section", "customer-group");
    const header = el("div", "customer-header");
    const name = el("span", "", customer.customerName || "Customer");
    name.dir = "auto";
    const id = el("small", "", "ID: " + (customer.customerId !== "" ? customer.customerId : "—"));
    id.dir = "auto";
    header.appendChild(name);
    header.appendChild(id);
    group.appendChild(header);

    customer.services.forEach(s => {
      const q = Number(s.quantity) || 1;
      const completeCount = Number(s.completedCount != null ? s.completedCount : s.completeCount) || 0;
      const deliveredCount = Number(s.deliveredCount) || 0;

      // Default: yellow if order is pending, else follow order status
      let itemStatus = (st === "pending") ? "pending" : serviceStatus;

      // 1) completeCount check -> green
      if (completeCount >= q) {
        itemStatus = "complete-full";
      }
      // 2) deliveredCount check -> gray (replaces green)
      if (deliveredCount >= q) {
        itemStatus = "delivered-full";
      }

      const item = el("div", "item status-" + itemStatus);
      const sname = el("div", "", s.serviceName || "");
      sname.className = "service-name";
      sname.dir = "auto";
      item.appendChild(sname);

      const details = el("div", "service-details");
      details.appendChild(el("small", "", "Completed " + completeCount + "/" + q));
      details.appendChild(el("small", "", "Delivered " + deliveredCount + "/" + q));
      details.appendChild(el("div", "service-price", "Total: " + pkr(s.price * q) + " · x " + q));
      item.appendChild(details);
      group.appendChild(item);
    });

    out.appendChild(group);
  });

  const sum = el("div", "sum");
  sum.appendChild(row("Total", pkr(o.grandTotal)));
  if (o.discount) sum.appendChild(row("Discount", "- " + pkr(o.discount)));
  const paid = (o.advancePay || 0) + (o.additionalPay || 0);
  if (paid) sum.appendChild(row("Paid", pkr(paid)));
  sum.appendChild(row("Balance", pkr(o.balance), "bal " + (o.balance > 0 ? "red" : "green")));
  out.appendChild(sum);
}

if (!u || !t) {
  show("Invalid link");
} else {
  firebase.firestore().doc("users/" + u + "/orderDb/" + t).get()
    .then(d => {
      if (!d.exists) return show("Order not found");
      const o = d.data();
      if (o.isDelete) return show("This order is no longer available");
      render(o);
    })
    .catch(() => show("Could not load order"));
}