declare module "*.png" {
  import { Image } from "love.graphics";
  const image: Image;
  export = image;
}
