'use strict';

/* ================================================
   LA MAISON DES GÂTEAUX — app.js
   ================================================ */

const WA_NUMBER = '221709595351';

/* ------------------------------------------------
   Utilitaires
------------------------------------------------ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatPrix(n) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

/* ------------------------------------------------
   PANIER — état
------------------------------------------------ */
let panier = chargerPanier();

function chargerPanier() {
  try {
    return JSON.parse(localStorage.getItem('mdg_panier')) || [];
  } catch {
    return [];
  }
}

function sauvegarderPanier() {
  localStorage.setItem('mdg_panier', JSON.stringify(panier));
}

function ajouterAuPanier(nom, prix, img) {
  const existant = panier.find(p => p.nom === nom);
  if (existant) {
    existant.qte += 1;
  } else {
    panier.push({ nom, prix: Number(prix), img, qte: 1 });
  }
  sauvegarderPanier();
  rendrePanier();
  ouvrirPanier();
  animerBadge();
}

function modifierQte(nom, delta) {
  const article = panier.find(p => p.nom === nom);
  if (!article) return;
  article.qte += delta;
  if (article.qte <= 0) {
    panier = panier.filter(p => p.nom !== nom);
  }
  sauvegarderPanier();
  rendrePanier();
}

function supprimerArticle(nom) {
  panier = panier.filter(p => p.nom !== nom);
  sauvegarderPanier();
  rendrePanier();
}

function totalPanier() {
  return panier.reduce((acc, p) => acc + p.prix * p.qte, 0);
}

function totalArticles() {
  return panier.reduce((acc, p) => acc + p.qte, 0);
}

/* ------------------------------------------------
   PANIER — rendu DOM
------------------------------------------------ */
function rendrePanier() {
  const conteneur = $('#panier-items');
  const vide = $('#panier-vide');
  const footer = $('#panier-footer');
  const badge = $('#panier-badge');
  const totalEl = $('#panier-total-montant');
  const btnWa = $('#panier-whatsapp');

  const nb = totalArticles();
  badge.textContent = nb;
  badge.style.display = nb > 0 ? 'flex' : 'none';

  if (panier.length === 0) {
    vide.style.display = 'flex';
    footer.style.display = 'none';
    $$('.panier-item', conteneur).forEach(el => el.remove());
    return;
  }

  vide.style.display = 'none';
  footer.style.display = 'flex';

  /* Reconstruire les lignes */
  $$('.panier-item', conteneur).forEach(el => el.remove());

  panier.forEach(article => {
    const item = document.createElement('div');
    item.className = 'panier-item';
    item.dataset.nom = article.nom;
    item.innerHTML = `
      <div class="panier-item__img" aria-hidden="true"
           style="width:68px;height:68px;border-radius:8px;flex-shrink:0;
                  background:linear-gradient(135deg,#F2A7BB,#C9A84C);
                  display:flex;align-items:center;justify-content:center;
                  font-size:1.5rem;">🎂</div>
      <div class="panier-item__info" style="flex:1;">
        <p class="panier-item__nom">${article.nom}</p>
        <p class="panier-item__prix">${formatPrix(article.prix)}</p>
        <div class="panier-item__qte">
          <button class="qte-btn" data-action="moins" data-nom="${article.nom}" aria-label="Diminuer la quantité">−</button>
          <span class="qte-valeur">${article.qte}</span>
          <button class="qte-btn" data-action="plus"  data-nom="${article.nom}" aria-label="Augmenter la quantité">+</button>
        </div>
      </div>
      <button class="panier-item__suppr" data-nom="${article.nom}" aria-label="Supprimer ${article.nom}"
              style="background:none;border:none;cursor:pointer;color:#d9849b;font-size:1.1rem;align-self:flex-start;padding:.2rem;">✕</button>
    `;
    conteneur.appendChild(item);
  });

  totalEl.textContent = formatPrix(totalPanier());
  btnWa.href = genererLienWaPanier();
}

/* ------------------------------------------------
   PANIER — sidebar open/close
------------------------------------------------ */
const sidebar  = $('#panier-sidebar');
const overlay  = $('#overlay');

function ouvrirPanier() {
  sidebar.classList.add('ouvert');
  overlay.classList.add('actif');
  sidebar.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('#panier-fermer').focus();
}

function fermerPanier() {
  sidebar.classList.remove('ouvert');
  overlay.classList.remove('actif');
  sidebar.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  $('#panier-btn').focus();
}

function animerBadge() {
  const badge = $('#panier-badge');
  badge.classList.remove('badge-pulse');
  void badge.offsetWidth;
  badge.classList.add('badge-pulse');
}

/* Événements sidebar */
$('#panier-btn').addEventListener('click', ouvrirPanier);
$('#panier-fermer').addEventListener('click', fermerPanier);
overlay.addEventListener('click', fermerPanier);

/* Délégation dans #panier-items */
$('#panier-items').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    const nom = btn.dataset.nom;
    modifierQte(nom, btn.dataset.action === 'plus' ? 1 : -1);
    return;
  }
  const suppr = e.target.closest('.panier-item__suppr');
  if (suppr) supprimerArticle(suppr.dataset.nom);
});

/* Bouton voir catalogue depuis panier vide */
$('#panier-voir-catalogue')?.addEventListener('click', () => {
  fermerPanier();
  document.querySelector('#catalogue')?.scrollIntoView({ behavior: 'smooth' });
});

/* Escape key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar.classList.contains('ouvert')) fermerPanier();
});

/* ------------------------------------------------
   PANIER — message WhatsApp
------------------------------------------------ */
function genererLienWaPanier() {
  if (panier.length === 0) return '#';

  const lignes = panier.map(p =>
    `- ${p.nom} x${p.qte} — ${formatPrix(p.prix * p.qte)}`
  ).join('\n');

  const msg =
    `Bonjour La Maison des Gâteaux 🎂\n` +
    `Je souhaite commander :\n` +
    `${lignes}\n` +
    `Total : ${formatPrix(totalPanier())}\n` +
    `Paiement à la livraison. Merci !`;

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ------------------------------------------------
   FILTRES catégories
------------------------------------------------ */
const filtresBtns = $$('.filtre-btn');
const cartesProduits = $$('.carte-produit');

function appliquerFiltre(filtre) {
  filtresBtns.forEach(btn => {
    btn.classList.toggle('actif', btn.dataset.filtre === filtre);
    btn.setAttribute('aria-pressed', btn.dataset.filtre === filtre);
  });

  cartesProduits.forEach(carte => {
    const categories = (carte.dataset.category || '').split(' ');
    const visible = filtre === 'tous' || categories.includes(filtre);
    carte.style.display = visible ? '' : 'none';

    if (visible) {
      carte.style.opacity = '1';
      carte.style.transform = 'translateY(0)';
      carte.style.animation = 'none';
      void carte.offsetWidth;
      carte.style.animation = 'fadeInUp .35s ease both';
    }
  });
}

filtresBtns.forEach(btn => {
  btn.setAttribute('aria-pressed', btn.classList.contains('actif'));
  btn.addEventListener('click', () => appliquerFiltre(btn.dataset.filtre));
});

/* ------------------------------------------------
   BOUTONS "Ajouter au panier"
------------------------------------------------ */
$$('.carte-produit__ajouter').forEach(btn => {
  btn.addEventListener('click', () => {
    const { nom, prix, img } = btn.dataset;
    ajouterAuPanier(nom, prix, img);

    /* Feedback visuel sur le bouton */
    const texteOriginal = btn.textContent.trim();
    btn.textContent = '✓ Ajouté !';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = texteOriginal;
      btn.disabled = false;
    }, 1200);
  });
});

/* ------------------------------------------------
   FORMULAIRE SUR-MESURE
------------------------------------------------ */
const formSM = $('#form-sur-mesure');
const confirmEl = $('#form-confirmation');

if (formSM) {
  formSM.addEventListener('submit', e => {
    e.preventDefault();

    const prenom      = $('#sm-prenom').value.trim();
    const tel         = $('#sm-tel').value.trim();
    const evenement   = $('#sm-evenement').value;
    const date        = $('#sm-date').value;
    const description = $('#sm-description').value.trim();

    /* Validation basique */
    if (!prenom || !tel || !evenement || !date) {
      afficherConfirmation('Veuillez remplir tous les champs obligatoires (*).', false);
      return;
    }

    const dateFormatee = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const msg =
      `Bonjour La Maison des Gâteaux 🎂\n` +
      `Je souhaite un gâteau sur-mesure.\n\n` +
      `👤 Prénom : ${prenom}\n` +
      `📱 Téléphone : ${tel}\n` +
      `🎉 Événement : ${evenement}\n` +
      `📅 Date : ${dateFormatee}\n` +
      (description ? `📝 Détails : ${description}\n` : '') +
      `\nMerci !`;

    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );

    afficherConfirmation('Votre demande a été envoyée ! Nous vous répondons sous 2 h. 🎂', true);
    formSM.reset();
  });
}

function afficherConfirmation(texte, succes) {
  if (!confirmEl) return;
  confirmEl.textContent = texte;
  confirmEl.style.display = 'block';
  confirmEl.style.padding = '.75rem 1rem';
  confirmEl.style.borderRadius = '8px';
  confirmEl.style.marginTop = '1rem';
  confirmEl.style.fontSize = '.9rem';
  confirmEl.style.fontWeight = '600';

  if (succes) {
    confirmEl.style.background = '#d4edda';
    confirmEl.style.color = '#155724';
    confirmEl.style.border = '1px solid #c3e6cb';
  } else {
    confirmEl.style.background = '#f8d7da';
    confirmEl.style.color = '#721c24';
    confirmEl.style.border = '1px solid #f5c6cb';
  }

  setTimeout(() => {
    confirmEl.style.display = 'none';
  }, 6000);
}

/* ------------------------------------------------
   ACCORDION FAQ
------------------------------------------------ */
$$('.faq-question').forEach(question => {
  question.addEventListener('click', () => basculerFaq(question));

  question.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      basculerFaq(question);
    }
  });
});

function basculerFaq(question) {
  const item = question.closest('.faq-item');
  const estOuvert = item.classList.contains('ouvert');

  /* Fermer tous les autres */
  $$('.faq-item.ouvert').forEach(el => {
    if (el !== item) {
      el.classList.remove('ouvert');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    }
  });

  item.classList.toggle('ouvert', !estOuvert);
  question.setAttribute('aria-expanded', String(!estOuvert));
}

/* ------------------------------------------------
   SMOOTH SCROLL — liens d'ancre
------------------------------------------------ */
$$('a[href^="#"]').forEach(lien => {
  lien.addEventListener('click', e => {
    const href = lien.getAttribute('href');
    if (!href || href === '#') return;
    let cible;
    try { cible = document.querySelector(href); } catch { return; }
    if (!cible) return;
    e.preventDefault();
    const offset = 80;
    const top = cible.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ------------------------------------------------
   MENU HAMBURGER (mobile)
------------------------------------------------ */
const navToggle = $('#nav-toggle');
const menu = $('#menu');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const ouvert = menu.classList.toggle('ouvert');
    navToggle.setAttribute('aria-expanded', String(ouvert));
  });

  /* Fermer au clic sur un lien */
  $$('#menu a').forEach(lien => {
    lien.addEventListener('click', () => {
      menu.classList.remove('ouvert');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ------------------------------------------------
   APPARITION AU SCROLL (Intersection Observer)
------------------------------------------------ */
const styleAnim = document.createElement('style');
styleAnim.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes badgePulse {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.45); }
    100% { transform: scale(1); }
  }
  .badge-pulse { animation: badgePulse .4s ease; }
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity .5s ease, transform .5s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(styleAnim);

/* Cartes produits */
cartesProduits.forEach((carte, i) => {
  carte.style.animationDelay = `${(i % 4) * 60}ms`;
});

/* Sections reveal */
const elementsReveal = $$('.avis-carte, .etape-numero, .faq-item, #sur-mesure-contenu .texte, #sur-mesure-contenu .visuel');
elementsReveal.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

elementsReveal.forEach(el => observer.observe(el));

/* Cartes produits au scroll */
const observerCartes = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observerCartes.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

cartesProduits.forEach(carte => {
  carte.style.opacity = '0';
  carte.style.transform = 'translateY(28px)';
  carte.style.transition = 'opacity .45s ease, transform .45s ease';
  observerCartes.observe(carte);
});

/* ------------------------------------------------
   NAVBAR — ombre au scroll
------------------------------------------------ */
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10
    ? '0 4px 20px rgba(61,28,2,.12)'
    : '0 2px 12px rgba(61,28,2,.07)';
}, { passive: true });

/* ------------------------------------------------
   MODAL COMMANDE
------------------------------------------------ */
const modalOverlay  = $('#modal-overlay');
const modalCommande = $('#modal-commande');
const modalFermer   = $('#modal-fermer');
const formCommande  = $('#form-commande');

function ouvrirModal() {
  /* Peupler le récapitulatif */
  const recap = $('#modal-recap-items');
  recap.innerHTML = '';
  panier.forEach(article => {
    const el = document.createElement('div');
    el.className = 'modal-recap-item';
    el.innerHTML = `
      <div class="modal-recap-emoji" aria-hidden="true">🎂</div>
      <div class="modal-recap-info">
        <span class="modal-recap-nom">${article.nom}</span>
        <span class="modal-recap-qte">×${article.qte}</span>
      </div>
      <span class="modal-recap-prix">${formatPrix(article.prix * article.qte)}</span>
    `;
    recap.appendChild(el);
  });
  $('#modal-total-montant').textContent = formatPrix(totalPanier());

  /* Pré-remplir la date min (demain) */
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  $('#cmd-date').min = demain.toISOString().split('T')[0];
  if (!$('#cmd-date').value) $('#cmd-date').value = demain.toISOString().split('T')[0];

  modalOverlay.classList.add('actif');
  modalCommande.classList.add('ouvert');
  modalCommande.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#cmd-nom').focus(), 50);
}

function fermerModal() {
  modalOverlay.classList.remove('actif');
  modalCommande.classList.remove('ouvert');
  modalCommande.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* Intercepter le clic "Commander via WhatsApp" dans la sidebar */
$('#panier-whatsapp').addEventListener('click', e => {
  e.preventDefault();
  if (panier.length === 0) return;
  fermerPanier();
  setTimeout(ouvrirModal, 200);
});

modalFermer.addEventListener('click', fermerModal);
modalOverlay.addEventListener('click', fermerModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalCommande.classList.contains('ouvert')) fermerModal();
});

/* Soumission du formulaire */
if (formCommande) {
  formCommande.addEventListener('submit', e => {
    e.preventDefault();

    const nom     = $('#cmd-nom').value.trim();
    const tel     = $('#cmd-tel').value.trim();
    const adresse = $('#cmd-adresse').value.trim();
    const date    = $('#cmd-date').value;
    const note    = $('#cmd-note').value.trim();

    if (!nom || !tel || !adresse || !date) {
      const premiers = [...formCommande.querySelectorAll('[required]')]
        .find(el => !el.value.trim());
      if (premiers) premiers.focus();
      return;
    }

    const [y, m, d] = date.split('-');
    const dateFormatee = `${d}/${m}/${y}`;

    const lignes = panier.map(p =>
      `  • ${p.qte}× ${p.nom}  —  ${formatPrix(p.prix * p.qte)}`
    ).join('\n');

    const separateur = '─────────────────────────';

    const msg =
      `🛒 NOUVELLE COMMANDE\n` +
      `${separateur}\n\n` +
      `🎂 Produits commandés :\n${lignes}\n\n` +
      `💰 Total : ${formatPrix(totalPanier())}\n\n` +
      `${separateur}\n` +
      `📋 Informations client :\n` +
      `  • Nom       : ${nom}\n` +
      `  • Téléphone : ${tel}\n` +
      `  • Adresse   : ${adresse}\n` +
      `  • Livraison : ${dateFormatee}\n\n` +
      (note ? `📝 Note : ${note}\n\n` : `📝 Note : Paiement à la livraison\n\n`) +
      `${separateur}\n` +
      `Merci de confirmer la disponibilité et les détails de livraison. 🙏`;

    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`,
      '_blank', 'noopener,noreferrer'
    );

    panier = [];
    sauvegarderPanier();
    rendrePanier();
    fermerModal();
    formCommande.reset();
  });
}

/* ------------------------------------------------
   BANDEAU ANNONCE
------------------------------------------------ */
const annonceBar = $('#annonce-bar');
const annonceFermer = $('#annonce-fermer');

if (annonceFermer && annonceBar) {
  if (sessionStorage.getItem('annonce_fermee')) {
    annonceBar.style.display = 'none';
  }
  annonceFermer.addEventListener('click', () => {
    annonceBar.style.maxHeight = annonceBar.offsetHeight + 'px';
    annonceBar.style.transition = 'max-height .3s ease, opacity .3s ease, padding .3s ease';
    requestAnimationFrame(() => {
      annonceBar.style.maxHeight = '0';
      annonceBar.style.opacity = '0';
      annonceBar.style.padding = '0';
      annonceBar.style.overflow = 'hidden';
    });
    setTimeout(() => { annonceBar.style.display = 'none'; }, 320);
    sessionStorage.setItem('annonce_fermee', '1');
  });
}

/* ------------------------------------------------
   COMPTEUR STATS (animation au scroll)
------------------------------------------------ */
function animer(el, cible, duree = 1800) {
  const debut = performance.now();
  const update = (now) => {
    const t = Math.min((now - debut) / duree, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(ease * cible).toLocaleString('fr-FR');
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const statsSection = $('#stats');
if (statsSection) {
  const observerStats = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      $$('.stat-nombre[data-cible]').forEach(el => {
        animer(el, Number(el.dataset.cible));
      });
      observerStats.disconnect();
    }
  }, { threshold: 0.3 });
  observerStats.observe(statsSection);
}

/* ------------------------------------------------
   INIT
------------------------------------------------ */
rendrePanier();
appliquerFiltre('tous');
