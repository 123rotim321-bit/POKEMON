# Pokémon TCG Card Browser

A small static web app to browse and search Pokémon Trading Card Game cards using the Pokemon TCG API.

## Usage

1. Open `index.html` in a browser.
2. Search by card name (e.g. "Pikachu", "Charizard").
3. Use pagination controls to move through pages.

## Files

- `index.html`: App structure
- `styles.css`: Styling and layout
- `script.js`: API integration and search logic

## Notes

- Uses https://api.pokemontcg.io/v2/cards
- Maximum page size set to 24 for fast loading.
- Search query is filtered by card name with wildcard matching.
