// Boshlang'ich menyu (rasmdagi menyudan). Narxlarni admin paneldan o'zgartirish mumkin.
const it = (id, name, price, desc = '') => ({ id, name, price, desc, available: true });

export const defaultMenu = [
  { id: 'hotdog', name: 'Xot-dog', emoji: '🌭', img: '/img/hotdog.jpg', items: [
    it('hd1', 'Xot-dog oddiy', 15000), it('hd2', 'Xot-dog 2x', 20000, '2 ta sosiska'),
    it('hd3', 'Xot-dog pishloqli', 25000, 'Ustiga pishloq'), it('hd4', 'Triple hotdog', 20000, '3 ta sosiska + frew + sabzavot + chips'),
  ] },
  { id: 'nonburger', name: 'Non burger', emoji: '🥙', img: '', items: [
    it('nb1', 'Non burger oddiy', 30000), it('nb2', 'Non burger "Birzumda"', 35000),
    it('nb3', 'Non burger katta', 40000), it('nb4', 'Non burger katta (maxsus)', 50000),
  ] },
  { id: 'xaggi', name: 'Xaggi donar', emoji: '🌯', img: '', items: [
    it('xd1', 'Xaggi oddiy', 30000), it('xd2', 'Xaggi go\'shtli', 35000),
  ] },
  { id: 'donar', name: 'Donar', emoji: '🥩', img: '', items: [
    it('dn1', 'Donar oddiy', 30000), it('dn2', 'Donar pishloqli', 40000),
  ] },
  { id: 'lavash', name: 'Lavash', emoji: '🌯', img: '/img/lavash.jpg', items: [
    it('lv1', 'Lavash oddiy', 30000), it('lv2', 'Lavash "Birzumda"', 35000),
    it('lv3', 'Lavash katta', 40000), it('lv4', 'Lavash katta (maxsus)', 50000),
  ] },
  { id: 'burger', name: 'Gamburger', emoji: '🍔', img: '', items: [
    it('gb1', 'Gamburger', 30000), it('gb2', 'Gamburger 2x', 40000),
  ] },
  { id: 'kfc', name: 'KFC strips qarsildoq', emoji: '🍗', img: '', items: [
    it('kf1', 'KFC strips 1 kg', 90000, 'Qarsildoq, shirali'),
  ] },
  { id: 'kofe', name: 'Kofe', emoji: '☕', img: '', items: [
    it('kc1', 'Qora kofe', 8000), it('kc2', 'Sutli kofe', 8000), it('kc3', 'Kofe "Sobo"', 10000),
  ] },
];
