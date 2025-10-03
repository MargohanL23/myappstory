// src/scripts/routes/routes.js
import Home from '../views/home.js';
import AddStory from '../views/add-story.js';
import About from '../views/about.js';
import Login from '../views/login.js';
import Register from '../views/register.js';
import Favorite from '../views/favorite.js'; 

const routes = {
  '/home': Home,
  '/add': AddStory,
  '/about': About,
  '/favorite': Favorite, 
  '/login': Login,
  '/register': Register,
};

export default routes;