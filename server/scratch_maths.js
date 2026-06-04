const html = `
<li> <a>5. Espaces vectoriels.</a>
	<ul>
	<li><a href="5A_ev_generalites.pdf" target="_blank">A. Introduction. Cours</a></li>
	<li><a href="5A_ev_generalites_exercices.pdf" target="_blank">A. Introduction. Exercices </a></li>
	<li><a href="5B_ev_familles.pdf" target="_blank">B. Familles de vecteurs. Cours</a></li>
	<li><a href="5B_ev_familles_exercices.pdf" target="_blank">B. Familles de vecteurs. Exercices.</a></li>
	<li><a href="5C_ev_dimension.pdf" target="_blank">C. Dimension finie. Cours</a></li>
	<li><a href="5C_ev_dimension_exercices.pdf" target="_blank">C. Dimension finie. Exercices.</a></li>
	<li><a href="5D_ev_operations.pdf" target="_blank">D. Intersection et somme. Cours</a></li>
	<li><a href="5D_ev_operations_exercices.pdf" target="_blank">D. Intersection et somme. Exercices</a></li>
	</ul>
</li>
<li> <a>6. Applications lin&eacute;aires.</a>
	<ul>
	<li><a href="6A_al.pdf" target="_blank">A. G&eacute;n&eacute;ralit&eacute;s. Cours</a></li>
	<li><a href="6A_al_exercices.pdf" target="_blank">A. G&eacute;n&eacute;ralit&eacute;s. Exercices</a></li>
 	</ul>
</li>
<li> <a>4. Polyn&ocirc;mes.</a>
	<ul>
	<li><a href="4_polynomes.pdf" target="_blank">Cours</a></li>
	<li><a href="4_polynomes_exercices.pdf" target="_blank">Exercices</a></li>
	</ul>
</li>
`;

function decodeEntities(str) {
    return str.replace(/&eacute;/g, 'é').trim();
}

const cours = [];
const sectionName = 'Algèbre';

const chapterRegex = /<li>\s*<a>([^<]+)<\/a>\s*<ul>([\s\S]*?)<\/ul>/gi;
let chMatch;
while ((chMatch = chapterRegex.exec(html)) !== null) {
  const title = decodeEntities(chMatch[1]).replace(/^\d+\.\s*/, '').trim();
  const innerHtml = chMatch[2];
  
  const subchapters = {};
  let hasSubchapters = false;

  const pdfRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
  let pdfMatch;
  while ((pdfMatch = pdfRegex.exec(innerHtml)) !== null) {
    const labelRaw = decodeEntities(pdfMatch[2]).trim();
    const labelLow = labelRaw.toLowerCase();
    const isExercice = labelLow.includes('exercice');
    const url = pdfMatch[1];

    const subMatch = labelRaw.match(/^([A-Z])\.\s*(.*?)(?:\.\s*Cours|\.\s*Exercices|\s*Cours|\s*Exercices|)$/i);

    if (subMatch) {
      hasSubchapters = true;
      const subLetter = subMatch[1].toUpperCase();
      let subTitlePart = labelRaw.replace(/\.?\s*Cours\s*$/i, '').replace(/\.?\s*Exercices\.?\s*$/i, '').trim();
      subTitlePart = subTitlePart.replace(/^[A-Z]\.\s*/i, '');
      
      if (!subchapters[subLetter]) {
        subchapters[subLetter] = { 
          title: \`\${title} - \${subLetter}. \${subTitlePart}\`, 
          coursUrl: null, 
          exercicesUrl: null 
        };
      }
      if (isExercice) subchapters[subLetter].exercicesUrl = url;
      else subchapters[subLetter].coursUrl = url;
    } else {
      if (!subchapters['main']) {
        subchapters['main'] = { title, coursUrl: null, exercicesUrl: null };
      }
      if (isExercice) subchapters['main'].exercicesUrl = url;
      else subchapters['main'].coursUrl = url;
    }
  }

  if (hasSubchapters) {
    for (const key of Object.keys(subchapters)) {
      if (key === 'main') continue;
      const sub = subchapters[key];
      if (sub.coursUrl || sub.exercicesUrl) cours.push({ section: sectionName, title: sub.title, cours: sub.coursUrl, exercices: sub.exercicesUrl });
    }
    if (subchapters['main'] && (subchapters['main'].coursUrl || subchapters['main'].exercicesUrl)) {
        cours.push({ section: sectionName, title: subchapters['main'].title, cours: subchapters['main'].coursUrl, exercices: subchapters['main'].exercicesUrl });
    }
  } else if (subchapters['main']) {
    const main = subchapters['main'];
    if (main.coursUrl || main.exercicesUrl) cours.push({ section: sectionName, title: main.title, cours: main.coursUrl, exercices: main.exercicesUrl });
  }
}

console.log(cours);
