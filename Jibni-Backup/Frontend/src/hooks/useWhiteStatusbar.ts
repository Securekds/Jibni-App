// Removed useFocusEffect - it requires NavigationContainer
// We'll use useEffect instead
import { useEffect } from "react";
import { StatusBar } from "react-native";

const useWhiteStatusbarColor = () => {
  useEffect(() => {
    setTimeout(() => {
      StatusBar.setBarStyle("light-content", true);
    }, 0);
    return () => StatusBar.setBarStyle("dark-content");
  }, []);
};

export default useWhiteStatusbarColor;