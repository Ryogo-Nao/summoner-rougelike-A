// `npm run characters`：キャラクターの台帳から docs/characters.md を作り直す
import { writeFileSync } from 'node:fs';
import { renderCharactersDoc } from './characters-doc.ts';

writeFileSync('docs/characters.md', renderCharactersDoc());
console.log('docs/characters.md を作り直した');
