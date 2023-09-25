function updateCards(data) {
  console.log('data', data);
  const cards = document.querySelectorAll('[data-component="summaryCard"');
  cards.forEach(card => {
    const metric = card.dataset.metric;
    const value = data[0][metric];
    if(value) {
      card.querySelector('[data-slot="value"]').innerHTML = value;
    }
  });
}

export const SummaryCards = {
  updateCards,
}
