import Head from "next/head";
import Navbar from "../components/navbar";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import Window from "../components/window";
import { setCookie, getCookie, hasCookie } from "cookies-next";
import Modal from "../components/modal";
import Toast from "../components/toast";
import Container from "../components/container";

const elements = [
  { name: "Dashboard", current: false },
  { name: "TicTacToe", current: false },
  { name: "Sudoku", current: false },
  { name: "Chess", current: true },
];

export default function Home() {
  const selectedGame = (game) => {
    setCurrentElement(game);
  };

  const childSetModal = (modal) => {
    setCurrentModal(modal);
  };

  const closeToast = () => {
    setToast({ type: null, message: null });
  };

  const changeTheme = (theme) => {
    setTheme(theme);
    setCookie("site_theme", theme);
  };

  const [currentElement, setCurrentElement] = useState("Chess");
  const [currentModal, setCurrentModal] = useState("");
  const [toast, setToast] = useState({ type: null, message: null });
  const [theme, setTheme] = useState();

  useEffect(() => {
    toast.type != null
      ? setTimeout(() => setToast({ type: null, message: null }), 2500)
      : "";
  }, [toast]);

  useEffect(() => {
    if (hasCookie("site_theme")) setTheme(getCookie("site_theme"));
    else {
      setTheme("light");
      setCookie("site_theme", "light");
    }

    // axios.get("/api/tutorials").then((response) => {
    //   console.log(response);
    // });
  }, []);

  return (
    <>
      <Head>
        <title>GameHub</title>
        <link rel="shortcut icon" href="/images/favicon.ico" />
      </Head>
      <Container theme={theme}>
        <Navbar
          theme={theme}
          elements={elements}
          selectGame={selectedGame}
          childSetTheme={changeTheme}
          childSetModal={childSetModal}></Navbar>
        <Window
          theme={theme}
          setToast={setToast}
          childSetModal={childSetModal}
          window={currentElement}></Window>
        <Modal
          theme={theme}
          modal={currentModal}
          childSetModal={childSetModal}></Modal>
        <Toast theme={theme} toast={toast} closeToast={closeToast}></Toast>
      </Container>
    </>
  );
}
