window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-payment');
  const cancelBtn = document.getElementById('cancel');
  const balanceVal = document.getElementById('balance-val');
  const bodyTbl = document.getElementById('payments');
  const limitF = document.getElementById('limit-date');

  const idField = document.getElementById('pay-id');
  // const srcF = document.getElementById('source');
  // const amtF = document.getElementById('amount');
  // const dateF = document.getElementById('date');
  // const monthsF = document.getElementById('months');
  // const pauseF = document.getElementById('pause');
  // const batchSrc = document.getElementById('batch-source');
  // const batchAmt = document.getElementById('batch-amount');
  // const batchStart = document.getElementById('batch-start');
  // const batchEnd = document.getElementById('batch-end');
  // const batchBtn = document.getElementById('batch-update');
  // const setLimitBtn = document.getElementById('set-limit');
  // const balP = document.getElementById('balance');
  // const body = document.getElementById('payments');

  // Modal
  const modal = document.getElementById('modal');
  document.getElementById('open-batch').onclick = () => modal.style.display = 'flex';
  document.getElementById('close-batch').onclick = () => modal.style.display = 'none';

  // Fonction de rendu du tableau
  function renderPayments(pays) {
    bodyTbl.innerHTML = '';
    let lastM = '';
    pays.forEach(p => {
      const m = new Date(p.sampling_date).toLocaleString('fr-FR',{month:'long',year:'numeric'});
      if (m !== lastM) {
        const trH = document.createElement('tr'); trH.className='month-header';
        trH.innerHTML = `<td colspan="6">${m}</td>`;
        bodyTbl.appendChild(trH);
        // Totaux mensuels
        const posSum = pays.filter(x => new Date(x.sampling_date).toLocaleString('fr-FR',{month:'long',year:'numeric'})===m && x.amount>=0)
                          .reduce((a,x)=>a+parseFloat(x.amount),0);
        const negSum = pays.filter(x => new Date(x.sampling_date).toLocaleString('fr-FR',{month:'long',year:'numeric'})===m && x.amount<0)
                          .reduce((a,x)=>a+parseFloat(x.amount),0);
        const trS = document.createElement('tr');
        trS.innerHTML = `<td colspan="2">Totaux</td>
                         <td class="positive">+${posSum.toFixed(2)}</td>
                         <td></td>
                         <td class="negative">${negSum.toFixed(2)}</td>
                         <td></td>`;
        bodyTbl.appendChild(trS);
        lastM = m;
      }
      const tr = document.createElement('tr');
      tr.className = p.amount>=0 ? 'positive' : 'negative';
      tr.innerHTML = `
        <td class="actions">
          <button class="edit" data-id="${p.id}">✏️</button>
          <button class="del" data-id="${p.id}">🗑️</button>
        </td>
        <td>${p.source}</td>
        <td>${parseFloat(p.amount).toFixed(2)}</td>
        <td>${p.sampling_date}</td>
        <td>${p.nbr_month}</td>
        <td>${p.pause ? 'Oui' : 'Non'}</td>
      `;
      bodyTbl.appendChild(tr);
    });
    // Attacher handlers
    document.querySelectorAll('.edit').forEach(btn => btn.onclick = async () => {
      const pays = await window.api.getPayments();
      startEdit(btn.dataset.id, pays);
    });
    document.querySelectorAll('.del').forEach(btn => btn.onclick = async () => {
      await window.api.deletePayment(btn.dataset.id);
      refreshAll();
    });
  }

  // Fonction de rafraîchissement
  async function refreshAll() {
    balanceVal.textContent = parseFloat(await window.api.getBalance()).toFixed(2);
    limitF.value = await window.api.getLimitDate();
    const pays = await window.api.getPayments();
    renderPayments(pays);
  }

  // Démarrage de l'édition d'un paiement
  function startEdit(id, pays) {
    const p = pays.find(x => x.id == id);
    document.getElementById('pay-id').value = p.id;
    document.getElementById('source').value = p.source;
    document.getElementById('amount').value = p.amount;
    document.getElementById('date').value = p.sampling_date;
    document.getElementById('months').value = p.nbr_month;
    document.getElementById('pause').checked = !!p.pause;
    cancelBtn.style.display = '';
  }

  cancelBtn.onclick = () => { form.reset(); idField.value=''; cancelBtn.style.display='none'; };

  // Soumission du formulaire principal
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {
      id: document.getElementById('pay-id').value || null,
      source: document.getElementById('source').value,
      amount: parseFloat(document.getElementById('amount').value),
      sampling_date: document.getElementById('date').value,
      nbr_month: parseInt(document.getElementById('months').value, 10),
      pause: document.getElementById('pause').checked
    };
    if (data.id) await window.api.updatePayment(data);
    else await window.api.createPayment(data);
    form.reset(); idField.value=''; cancelBtn.style.display='none';
    refreshAll();
    console.log("je reset");
  };

  // Mise à jour en masse
  document.getElementById('batch-form').onsubmit = async e => {
    e.preventDefault();
    await window.api.updateBySource({
      source: document.getElementById('batch-source').value,
      newAmount: parseFloat(document.getElementById('batch-amount').value),
      startDate: document.getElementById('batch-start').value,
      endDate: document.getElementById('batch-end').value
    });
    modal.style.display='none';
    refreshAll();
  };

  // Date limite
  document.getElementById('set-limit').onclick = async () => { await window.api.setLimitDate(limitF.value); refreshAll(); };

  // Initialisation
  refreshAll();
});
