let lat = 48.852969;
let lon = 2.349903;
let limites = [];
let markers = L.markerClusterGroup();

let map = L.map("map", {
    zoom: 13,
    center: [lat, lon]
});

L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    minZoom: 1,
    maxZoom: 20,
}).addTo(map);

fetch("villes.json")
    .then(data => data.json())
    .then(villes => {
        for(let [ville, contenu] of Object.entries(villes)){
            let coords = [contenu.lat, contenu.lon];
            
            let icone = L.icon({
                iconUrl: "./js/image/gps.png",
                iconSize: [48,48],
                iconAnchor: [12.5, 41],
                popupAnchor: [0, -41]
            });
            
            let marker = L.marker(coords, {
                icon: icone
            });

            let popup = `<div class="popup">
                            <img src="/images/${contenu.image}" alt="${ville}" width="50" height="50">
                            <div>
                                <h2>${ville}</h2>
                                <p>${contenu.description}</p>
                                <button class="btn-info" onclick="chargerInfoApi('${ville}')">voir information sur la ville</button>
                            </div>
                        </div>`;

            marker.bindPopup(popup);
            limites.push(coords);

            markers.addLayer(marker);
        }

        map.addLayer(markers);

        map.fitBounds(limites);
    });

window.villesData = null;

fetch("villes.json")
    .then(data => data.json())
    .then(villes => {
        window.villesData = villes; 
        
    });

async function villeAPisteCyclable(url, codeInsee) {
  const res = await fetch(url);
  const data = await res.json();

  for (const feature of data.features) {
    const props = feature.properties;

    if (
      props.code_com_d === codeInsee ||
      props.code_com_g === codeInsee
    ) {
      if (props.ame_d !== "AUTRE" || props.ame_g !== "AUTRE") {
        return true;
      }
    }
  }
  return false;
}

function chargerInfoApi(ville) {
    const info = window.villesData[ville];
    
    let panel = document.getElementById('ville-panel');
    let section = document.getElementsByClassName('news')[0];

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'ville-panel';
        panel.className = 'ville-panel';
        section.appendChild(panel)
    }

// utilisation
villeAPisteCyclable("js/france-20260112.geojson", info.code_commune)
  .then(result => {
    const cyclableMessage = result
        ? "La ville dispose de piste cyclable."
        : "Pas de piste cyclable trouvée.";

      // api eau
      const urlEau = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${info.code_commune}&fields=conclusion_conformite_prelevement&size=20`;

      return fetch(urlEau, {
        headers: {
          "accept": "application/json"
        }
      })
      .then(result => result.json())
      .then(data => {
        const qualité = data.data[0].conclusion_conformite_prelevement;
// api projets environnement
          const urlProjets = `https://www.projets-environnement.gouv.fr/api/records/1.0/search?dataset=projets-environnement-diffusion&q=${ville}&rows=100`;
          
          return fetch(urlProjets, {
            headers: {
              "accept": "application/json"
            }
          })
          .then(result => result.json())
          .then(dataProjets => {
            const nbProjets = dataProjets.nhits || 0;
            let projetsHTML = '';
            
            if (dataProjets.records && dataProjets.records.length > 0) {
              projetsHTML = '<ul class="projets-list">';
              dataProjets.records.forEach(projet => {
                const titre = projet.fields.dc_title || 'Projet sans titre';
                projetsHTML += `<li>${titre}</li>`;
              });
              projetsHTML += '</ul>';
            }

            panel.innerHTML = `
              <div class="panel-header">
                <h2>${ville}</h2>
              </div>
              <p>${info.description}</p>
              <p>Code INSEE: ${info.code_commune}</p>
              </br>
              <p class="cyclable">${cyclableMessage}</p>
              </br>
              <p>${qualité}</p>
              </br>
              <p><strong>Projets environnementaux : ${nbProjets}</strong></p>
              ${projetsHTML}
            `;
          });
        });
      })
      .then(() => {
        map.flyTo([info.lat, info.lon], 12, {
          duration: 1.5
        });
      });
}