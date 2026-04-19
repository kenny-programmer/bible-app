import { fetchChapter } from './lib/bible-api';

async function main() {
    const result = await fetchChapter('John', 1, 'web');
    console.log(result ? `Success! Verses: ${result.verses.length}` : 'Null returned');
    console.log(result?.verses[0]);
}

main().catch(console.error);
