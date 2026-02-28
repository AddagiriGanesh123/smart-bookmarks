const fs = require('fs');
let js = fs.readFileSync('frontend/js/app.js', 'utf8');

// Fix line ~42 - the nav listener that stops msgPoll crashes because it runs at page load
// Replace the broken nav listener at bottom with a safe version
js = js.replace(
  /document\.querySelectorAll\("\.nav-links li"\)\.forEach\(function\(li\)\{li\.addEventListener\("click",function\(\)\{if\(li\.dataset\.page!=="messages"&&_msgPoll\)\{clearInterval\(_msgPoll\);_msgPoll=null;_msgSel=null;\}\}\);\}\);/g,
  ''
);

// Also fix the one with single quotes
js = js.replace(
  /document\.querySelectorAll\('\.nav-links li'\)\.forEach\(function\(li\)\{li\.addEventListener\('click',function\(\)\{if\(li\.dataset\.page!=='messages'&&_msgPoll\)\{clearInterval\(_msgPoll\);_msgPoll=null;_msgSel=null;\}\}\);\}\);/g,
  ''
);

// Fix the nav click listener that already exists in app.js - add messages stop poll safely
js = js.replace(
  `document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    li.classList.add('active');
    const page = li.dataset.page;
    document.getElementById('page-' + page).classList.add('active');
    loadPage(page);
  });
});`,
  `document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    li.classList.add('active');
    const page = li.dataset.page;
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    if (page !== 'messages' && typeof _msgPoll !== 'undefined' && _msgPoll) {
      clearInterval(_msgPoll); _msgPoll = null; _msgSel = null;
    }
    loadPage(page);
  });
});`
);

fs.writeFileSync('frontend/js/app.js', js, 'utf8');
console.log('done');
