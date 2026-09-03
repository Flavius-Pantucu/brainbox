import AuthModal from "../components/modals/auth_modal";
import RegisterModal from "../components/modals/register_modal";
import PasswordModal from "../components/modals/password_modal";
import GameOverModal from "./modals/gameover_modal";

export default function Modal(props) {
  const setModal = (modal) => {
    props.childSetModal(modal);
  };

  const current = props.modal;
  const theme = props.theme;

  switch (current) {
    case "login":
      return <AuthModal theme={theme} childSetModal={setModal}></AuthModal>;
    case "register":
      return (
        <RegisterModal theme={theme} childSetModal={setModal}></RegisterModal>
      );
    case "password":
      return (
        <PasswordModal theme={theme} childSetModal={setModal}></PasswordModal>
      );
    default:
      return <></>;
  }
}
