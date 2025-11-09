import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons } from "@ionic/react";
import { useHistory } from "react-router-dom";
import "./Home.css";
export default function MenuPage() {
  const history = useHistory();

  const startGame = (mode: "normal" | "hard") => {
    history.push(`/crossword?mode=${mode}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Palavras Cruzadas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding ion-text-center">
        <h2>Escolha o modo de jogo</h2>
        <IonButtons className="ion-justify-content-center">
          <IonButton expand="block" onClick={() => startGame("normal")}>Modo Normal</IonButton>
          <IonButton expand="block" color="tertiary" onClick={() => startGame("hard")}>Modo Difícil</IonButton>
        </IonButtons>
      </IonContent>
    </IonPage>
  );
}
