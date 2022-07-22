import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import Header from './components/Header';
import Card from './components/Card';
import Form from "./components/Form";
import { getAllCampaigns } from "./solana";

function App() {
  const [route, setRoute] = useState(0);
  const [cards, setCards] = useState([]);
  useEffect(() => {
    getAllCampaigns().then((val) => {
      // @ts-ignore
      setCards(val);
      console.log(val);
    });
  }, []);

  return (
   <div className="ui container">
     <Header setRoute={setRoute}/>
     {route === 0 ?
         <div>{cards.map((e, idx) => (
             <Card
                 // @ts-ignore
              key={e.pubId.toString()}
              data={{
                // @ts-ignore
                title: e.name,
                // @ts-ignore
                description: e.description,
                // @ts-ignore
                amount: (e.amount_donated).toString(),
                // @ts-ignore
                image: e.image_link,
                // @ts-ignore
                id: e.pubId,
              }}
              setCards={setCards}
             />
         ))}</div>
         :
         <Form setRoute={(e: React.SetStateAction<number>) => {
           setRoute(e);
           getAllCampaigns().then((val: any) => {
             setCards(val);
           });
         }} />
     }
   </div>
  );
}

export default App;
