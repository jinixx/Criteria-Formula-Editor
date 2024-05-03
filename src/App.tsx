import { useState } from "react";
import QueryBuilder from "./lib/QueryBuilder";
import "./App.css";

function App() {
  const [error, setError] = useState("");

  const handleOnChange = (e) => {
    try {
      const objArr = QueryBuilder.parse(e.target.value);

      console.log("res:", objArr);

      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="App">
      <textarea
        style={{
          height: "300px",
          width: "500px",
        }}
        onChange={handleOnChange}
      />
      <div>{error}</div>
    </div>
  );
}

export default App;
