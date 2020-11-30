# love-inline-import

A [TypeScriptToLua](https://typescripttolua.github.io/) plugin that in-lines image imports.

## How to use

Add the plugin

```bash
yarn add -D love-inline-import
# or npm install -D love-inline-import
```

Register the plugin in your `tsconfig.json`

```json
{
  "tstl": {
    "luaPlugins": [
      { "name": "love-inline-import" }
    ]
  }
}
```

Tell TypeScript that a png import returns an `Image` type

```ts
// add this ambient code to a file within your project
// this tells TypeScript that imports ending with .png
// are expected to return an image type
declare module "*.png" {
  import { Image } from "love.graphics";
  const image: Image;
  export = image;
}
```

And you're good to go! Here's some sample input and output code

```ts
import * as player from "./player.png";

love.draw = () => {
  love.graphics.draw(player);
};
```

```lua
local player = love.graphics.newImage(...) -- ... is generated and contains image data

love.draw = function()
  love.graphics.draw(player)
end
```

## Features
- Allows images to be stored in your source directory
- Image resolution is handled on compilation
