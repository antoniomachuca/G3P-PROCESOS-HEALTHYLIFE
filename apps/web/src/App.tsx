import { CatalogoEventos } from './components/CatalogoEventos';

// Solo monta el listado de eventos (HU-01 / G3P-8).
// Navbar, hero, filtros, banner y pie son elementos globales de otras historias.
export default function App() {
  return (
    <main>
      <CatalogoEventos />
    </main>
  );
}
