import { Bookstand } from "./components/Bookstand";
import { Ambient } from "./components/Ambient";
import { Notebook } from "./components/Notebook";
import { Toasts } from "./components/Toasts";
import { useAppUpdate } from "./lib/native";
import { useRoute } from "./lib/route";
import { useLoaded } from "./lib/store";

export function App() {
  const loaded = useLoaded();
  const route = useRoute();
  const update = useAppUpdate();
  if (!loaded) return <Ambient />;
  return (
    <>
      <Ambient />
      {route.view === "book" ? (
        <Notebook key={route.id} notepadId={route.id} pageId={route.page} />
      ) : (
        <Bookstand />
      )}
      <Toasts />
      {update && (
        <div className="hint-toast update-toast">
          YANA {update.version} is ready
          <button className="btn small primary" onClick={update.restart}>
            Restart
          </button>
        </div>
      )}
    </>
  );
}
