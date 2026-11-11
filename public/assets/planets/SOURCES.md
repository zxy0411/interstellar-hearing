# Solar-system observatory: sources and credits

Verified and downloaded on 2026-11-11.

## Texture attribution and license

Planetary texture maps by **Solar System Scope**, from [Solar Textures](https://www.solarsystemscope.com/textures/), licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

The source page describes the maps as equirectangular planetary maps based on NASA imagery and elevation data, with adjusted colors. Some unmapped areas are filled with reconstructed terrain. These are mapped visualizations, not unmodified single spacecraft photographs. The original downloaded texture files are unchanged.

The author permits use, adaptation and sharing, including commercial use, with attribution. The app links the creator and the license in both the daily opening and the atlas footer. Retain these credits when distributing the app or derived assets. Neither Solar System Scope nor NASA endorses this app.

| Local file | Original download |
| --- | --- |
| `2k_saturn.jpg` | [Saturn map](https://www.solarsystemscope.com/textures/download/2k_saturn.jpg) |
| `2k_jupiter.jpg` | [Jupiter map](https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg) |
| `2k_earth_daymap.jpg` | [Earth daytime map](https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg) |
| `2k_mars.jpg` | [Mars map](https://www.solarsystemscope.com/textures/download/2k_mars.jpg) |
| `2k_neptune.jpg` | [Neptune map](https://www.solarsystemscope.com/textures/download/2k_neptune.jpg) |
| `2k_uranus.jpg` | [Uranus map](https://www.solarsystemscope.com/textures/download/2k_uranus.jpg) |
| `2k_venus_atmosphere.jpg` | [Venus atmosphere map](https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg) |
| `2k_mercury.jpg` | [Mercury map](https://www.solarsystemscope.com/textures/download/2k_mercury.jpg) |
| `2k_saturn_ring_alpha.png` | [Saturn ring map](https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png) |
| `2k_earth_clouds.jpg` | [Earth cloud map](https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg) |

## Derived images and rendering

`{saturn,jupiter,earth,mars,neptune,uranus,venus,mercury}-poster.webp` and the corresponding `-thumb.webp` files are new rendered derivatives of these maps, created for this app on 2026-11-11. They use a textured sphere/ellipsoid, directional lighting, and a ring plane for Saturn. Earth combines the daytime and cloud maps. Poster images are 1300 × 1000 pixels; collection thumbnails are 208 × 160. Attribution: **Solar System Scope / CC BY 4.0; sphere projection and lighting adapted for 星际单词播放器**. The derivatives are also shared under CC BY 4.0.

The live version in `journey.mjs` renders the same maps with native WebGL, with slow illustrative rotation and a small camera approach. The posters are local fallbacks when WebGL is unavailable or texture upload is blocked, including restrictive `file:` contexts. Lighting, apparent scale, viewing angle, rotation speed and the collection order are presentation choices. They do not depict current positions, realistic time scale, or an actual spacecraft camera. The learning “galaxies” are progress groupings, not astronomical locations of the planets.

## Scientific facts

The following primary NASA Science pages support the two-sentence introductions and the three displayed metrics. Copy was paraphrased and translated for the interface. All orbital and rotational periods are approximate. Moon counts are deliberately omitted because they change as discoveries are confirmed.

| Planet | NASA source | Displayed diameter | Orbit | Rotation | Introduction topics |
| --- | --- | --- | --- | --- | --- |
| Saturn / 土星 | [Saturn Facts](https://science.nasa.gov/saturn/facts/) | Equatorial: 120,500 km | 29.4 Earth years | 10.7 hours | Rings consist of ice and rock; gas giant mainly hydrogen and helium. |
| Jupiter / 木星 | [Jupiter Facts](https://science.nasa.gov/jupiter/jupiter-facts/) | Mean: 139,822 km, twice NASA’s 69,911 km radius | About 12 Earth years | 9.9 hours | Largest planet; cloud belts flow in opposite directions; the Great Red Spot is a centuries-old storm. |
| Earth / 地球 | [Facts About Earth](https://science.nasa.gov/earth/facts/) | Equatorial: 12,756 km | 365.25 Earth days | 23.9 hours | Oceans cover about 71% of the surface; axial tilt produces seasons. |
| Mars / 火星 | [Mars Facts](https://science.nasa.gov/mars/facts/) | Mean: 6,780 km, twice NASA’s 3,390 km radius | 687 Earth days | 24.6 hours | Oxidized iron causes the rusty color; ancient valleys and lakebeds show a wetter past. |
| Neptune / 海王星 | [Neptune Facts](https://science.nasa.gov/neptune/neptune-facts/) | Equatorial: 49,528 km | About 165 Earth years | About 16 hours | Most distant of the eight planets; a long orbit around the Sun. |
| Uranus / 天王星 | [Uranus Facts](https://science.nasa.gov/uranus/facts/) | Equatorial: 51,118 km | About 84 Earth years | About 17 hours | Spins nearly on its side; methane absorption contributes to the blue-green color. |
| Venus / 金星 | [Venus Facts](https://science.nasa.gov/venus/venus-facts/) | Equatorial: 12,104 km | 225 Earth days | 243 Earth days | Dense atmosphere traps heat; slow rotation is opposite most planets. |
| Mercury / 水星 | [Mercury Facts](https://science.nasa.gov/mercury/facts/) | Mean: 4,880 km, twice NASA’s 2,440 km radius | 88 Earth days | About 59 Earth days | Craters record impacts; short orbital period. |

“Rotation” means one spin about the axis, not the interval between successive sunrises. For example, Venus’s rotation period is about 243 Earth days, while its solar day is different. Mean and equatorial diameters are explicitly distinguished in the app.

## Progress compatibility

Existing `days` and `lastIntroDay` storage is unchanged. The nth completed local day still owns `planet-n`. Names and imagery now use the real solar-system sequence: Saturn, Jupiter, Earth, Mars, Neptune, Uranus, Venus, Mercury. Later cycles add a voyage number to the display name while retaining unique collection IDs. Every seven completed days still unlocks one learning galaxy.
