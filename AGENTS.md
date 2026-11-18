# AGENTS.md

## Lessons

- Three.js is pinned to r187. The 3D scene loads on entry so the cover stays usable without WebGL 2.
- The walking world uses negative Z for inland and positive Z for the sea. Landscape height, shoreline and colliders are shared by the controller and scene. When placing buildings or props, keep the represented road corridors and landmark approaches walkable.
- Architecture batches share geometry layouts and materials when merging with Three.js BufferGeometryUtils. Static shadows are rendered again when switching lighting presets.
- Vite builds JavaScript without compiling its GLSL. Check WebGL errors on a browser render or compile shaders as GLSL ES 3.00 after editing them. GLSL reserves `patch` as a keyword.
- The bundled Noto TC fonts are subsetted to the text used on the site. Refresh the subsets when adding copy with new Chinese characters. The CSS includes system font fallbacks.
- The GitHub Pages workflow builds Vite with `--base=./` so the artifact works under a repository subpath. Use Vite-processed or base-aware URLs for new public assets.
