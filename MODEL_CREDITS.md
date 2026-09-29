# 3D-Modell Credits

Die fünf detaillierten Fluggeräte im Simulator werden als externe GLB-Modelle geladen.

## Modelle

| Im Spiel | Quelle | Lizenz |
|---|---|---|
| Airbus A320 | [amvlab aircraft-models](https://github.com/amvlab/aircraft-models), A320_nologo.glb | CC BY 4.0 |
| Boeing 747 | [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), angepasstes airplane.glb; Originalmodell von zairiq-123 | CC BY 4.0 |
| Airbus A380 | [amvlab aircraft-models](https://github.com/amvlab/aircraft-models), A380_nologo.glb | CC BY 4.0 |
| Rescue Helicopter | [Apex Warfare](https://github.com/mykolaantoniv/apex-warfare), attack-heli.glb; Quelle Poly Pizza / kazuma | CC0 1.0 |
| Recon Drone | [amvlab aircraft-models](https://github.com/amvlab/aircraft-models), drone_nologo.glb | CC BY 4.0 |

Die Modelle werden über CDN geladen, damit die GitHub-Pages-Datei klein bleibt.

Bei den CC-BY-Modellen ist die Namensnennung und der Lizenzhinweis erforderlich; die Modelle dürfen auch kommerziell verwendet und angepasst werden. Die verwendeten Modellquellen dokumentieren diese Lizenzen ausdrücklich.

## Technischer Hinweis

Three.js r128 verwendet den passenden globalen `THREE.GLTFLoader`. Die GLB-Modelle werden beim Start des jeweiligen Flugzeugs geladen. Falls ein Modell nicht erreichbar ist, bleibt das bisherige prozedurale Modell als Fallback sichtbar.
