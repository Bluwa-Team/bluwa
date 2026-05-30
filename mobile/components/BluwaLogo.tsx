import { Image } from "react-native";

type Props = {
  size?: number;
};

export default function BluwaLogo({ size = 32 }: Props) {
  return (
    <Image
      source={require("../assets/logo_icon.png")}
      style={{ width: size, height: size, resizeMode: "contain" }}
    />
  );
}
