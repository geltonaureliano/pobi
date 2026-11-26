const p = { fill: 'currentColor' }
export const Icones = {
  painel: () => (<svg viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1.5" {...p} /><rect x="9" y="1" width="6" height="6" rx="1.5" {...p} /><rect x="1" y="9" width="6" height="6" rx="1.5" {...p} /><rect x="9" y="9" width="6" height="6" rx="1.5" {...p} /></svg>),
  lancamentos: () => (<svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2.5" rx="1" {...p} /><rect x="1" y="6.75" width="14" height="2.5" rx="1" {...p} /><rect x="1" y="11.5" width="9" height="2.5" rx="1" {...p} /></svg>),
  contas: () => (<svg viewBox="0 0 16 16"><path d="M8 1 15 4.5V6H1V4.5Z" {...p} /><rect x="2.5" y="7" width="2" height="5" {...p} /><rect x="7" y="7" width="2" height="5" {...p} /><rect x="11.5" y="7" width="2" height="5" {...p} /><rect x="1" y="13" width="14" height="2" rx=".5" {...p} /></svg>),
  cartoes: () => (<svg viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="2" {...p} /><rect x="3" y="9.5" width="4" height="1.5" rx=".5" fill="#1c1c1c" /></svg>),
  dividas: () => (<svg viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="2" {...p} /><rect x="1" y="5.5" width="14" height="2" fill="#1c1c1c" /></svg>),
  orcamentos: () => (<svg viewBox="0 0 16 16"><rect x="1" y="9" width="3.5" height="6" rx="1" {...p} /><rect x="6.25" y="5" width="3.5" height="10" rx="1" {...p} /><rect x="11.5" y="1" width="3.5" height="14" rx="1" {...p} /></svg>),
  analises: () => (<svg viewBox="0 0 16 16"><path d="M8 0l1.8 5.2L15 7l-5.2 1.8L8 14l-1.8-5.2L1 7l5.2-1.8Z" {...p} /></svg>),
  ajustes: () => (<svg viewBox="0 0 16 16"><path d="M6.6 1h2.8l.4 2 1.5.9 1.9-.7 1.4 2.4-1.5 1.4v1.8l1.5 1.4-1.4 2.4-1.9-.7-1.5.9-.4 2H6.6l-.4-2-1.5-.9-1.9.7-1.4-2.4 1.5-1.4V7.1L1.4 5.6l1.4-2.4 1.9.7 1.5-.9Z" {...p} /><circle cx="8" cy="8" r="2.2" fill="#1c1c1c" /></svg>),
  relatorio: () => (<svg viewBox="0 0 16 16"><path d="M3 1h7l3 3v11H3Z" {...p} /><rect x="5" y="7" width="6" height="1.4" fill="#1c1c1c" /><rect x="5" y="10" width="4" height="1.4" fill="#1c1c1c" /></svg>),
  anual: () => (<svg viewBox="0 0 16 16"><path d="M1 13 5.5 7.5l3 3L15 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  receitas: () => (<svg viewBox="0 0 16 16"><path d="M8 1 14 7h-4v8H6V7H2Z" {...p} /></svg>),
  custos: () => (<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" {...p} /><path d="M8 4v4.5l3 2" fill="none" stroke="#1c1c1c" strokeWidth="1.6" strokeLinecap="round" /></svg>),
  categorias: () => (<svg viewBox="0 0 16 16"><path d="M1 1h6.5L15 8.5 8.5 15 1 7.5Z" {...p} /><circle cx="4.5" cy="4.5" r="1.4" fill="#1c1c1c" /></svg>),
  logo: () => (<svg viewBox="0 0 26 26" className="marca-logo"><path d="M2 2h22v6H8v4h16v12H2v-6h16v-4H2Z" fill="#fff" /></svg>),
}
