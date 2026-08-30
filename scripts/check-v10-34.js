const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const shell=fs.readFileSync('v2.js','utf8');

const requiredIds=[
  'libraryPage','libraryType','libraryStatus','librarySelectAll',
  'archiveSelectedActivities','deleteSelectedActivities',
  'libraryNewTraining','libraryNewOps','libraryNewCoaching','libraryNewRoute',
  'opsChoiceDialog','publicShareScreen','publicShareMap'
];
const missingIds=requiredIds.filter(id=>!new RegExp(`id=["']${id}["']`).test(html));
if(missingIds.length)throw new Error(`Identifiants V10.34 manquants : ${missingIds.join(', ')}`);

const requiredFunctions=[
  'activityLibraryRows','renderActivityLibrary','setLibraryVisibility',
  'archiveSelectedActivities','deleteSelectedActivities','loadPublicShareFromUrl'
];
const missingFunctions=requiredFunctions.filter(name=>!new RegExp(`function\\s+${name}\\s*\\(`).test(app));
if(missingFunctions.length)throw new Error(`Fonctions V10.34 manquantes : ${missingFunctions.join(', ')}`);

if(!shell.includes("{page:'libraryPage', icon:'🗂️', label:'Mes pistes'}"))throw new Error('La barre V2 ne pointe pas vers Mes pistes.');
if(shell.includes("{page:'trainingPage', icon:'◎', label:'Terrain'}"))throw new Error('L’ancien onglet Terrain est encore actif.');
if(/<span>Terrain<\/span>/.test(html))throw new Error('L’ancien onglet Terrain est encore présent dans le HTML.');
if(/<h2>Activité récente<\/h2>/.test(html))throw new Error('Le bloc Activité récente est encore présent.');

console.log(`${requiredIds.length} identifiants, ${requiredFunctions.length} fonctions et la navigation V10.34 vérifiés.`);
