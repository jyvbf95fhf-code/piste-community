import { PROTOTYPE_MODE } from './config.mjs';
if (!PROTOTYPE_MODE) throw new Error('Ce prototype ne possède aucun adaptateur de données réel.');
export const mock = Object.freeze({
  user: { name: 'Sébastien', initials: 'SL', role: 'Conducteur', permissions: { research: true, admin: true } },
  dog: { name: 'Nox', breed: 'Berger belge malinois', age: '3 ans' },
  session: { title: 'Sous les pins', place: 'Forêt de Fontainebleau', date: 'Aujourd’hui · 08:30', distance: '1,2 km', duration: '24 min', status: 'À reprendre' },
  activeSessions: [
    {title:'Sous les pins',date:'Aujourd’hui · 08:30',distance:'1,2 km',duration:'24 min',status:'EN COURS',terrain:'Forêt',trace:'red'},
    {title:'Crête du Nord',date:'Aujourd’hui · 06:15',distance:'3,6 km',duration:'1 h 12',status:'EN PAUSE',terrain:'Montagne',trace:'blue'}
  ],
  recent: { title: 'Lisière de forêt', date: 'Hier · 09:15', distance: '850 m', duration: '18 min' },
  stats: [{ value: '24', label: 'Sessions' }, { value: '32,8', unit: 'km', label: 'Parcourus' }, { value: '18', unit: 'h', label: 'Sur le terrain' }],
  notification: 'Votre session fictive « Sous les pins » est prête à être reprise.'
});
