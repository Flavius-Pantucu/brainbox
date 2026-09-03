# GameHub :video_game:

## Introduction :snowflake:

Welcome to GameHub! This platform is an open source application made with the [Next.js](https://nextjs.org/) framework.

## Content :card_file_box:

The application lives in a single Next.js project: the interface is rendered from `pages/` and `components/`, and the backend will be built inside `pages/api/`, which Next.js serves as server-side endpoints.

The application contains a series of logical games such as:

- [x] TicTacToe;
- [x] Sudoku;
- [ ] Chess.

> Note. Items marked with an X are, theoretically fully developed, but small changes might occur in the future testing.

## Games :game_die:

### TicTactoe
### Sudoku
### Chess

## Project structure :file_folder:

```
components/     UI components, one folder per game
pages/          routes (index.js is the app itself)
pages/api/      backend endpoints
public/         images and sounds
styles/         global stylesheet
```

## Running it :man_technologist:

If you are a curious mind and you want to enhance the application capabilites of use, you can get your hands on it too.

Steps:
- clone this repository;
- download and install the latest Node.js version from the official website;
- open a new terminal via your preffered IDE (ex. Visual Studio Code) and type in `npm install` so that the application downloads all the dependencies it needs;
- type `npm run dev` and open `http://localhost:3000`;
- enjoy!

For a production build, run `npm run build` followed by `npm start`.
