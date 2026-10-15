// Page « accès réservé » : même fond que la page d'accueil, logo Spengler Medical en 3D qui tourne.
import './acces.css';
import { mountLogoScene } from '../src/logo-scene.js';

mountLogoScene(document.getElementById('scene'), document.querySelector('.splash'), '/brand/logo-s.png');
