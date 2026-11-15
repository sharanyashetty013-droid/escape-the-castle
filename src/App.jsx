import "./App.scss";
import Experience from "./Experience/Experience";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import Modal from "./components/Modal/Modal";
import Game from "./components/Game/Game";

function App() {
  return (
    <>
      <LoadingScreen />
      <Modal />
      <Game />
      <Experience />
    </>
  );
}

export default App;
