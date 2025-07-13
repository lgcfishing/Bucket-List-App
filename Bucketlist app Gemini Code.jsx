import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// Ensure __app_id, __firebase_config, and __initial_auth_token are available in the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase outside of the component to avoid re-initialization
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Boulder, Colorado coordinates for distance calculation
const BOULDER_LAT = 40.014984;
const BOULDER_LON = -105.270546;

// Haversine distance calculation function (returns distance in miles)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c; // Distance in kilometers
  return (distanceKm * 0.621371).toFixed(1); // Convert to miles and format to 1 decimal place
};

// --- Comprehensive Initial Bucket List Data ---
const initialBucketListData = [
  // --- Hikes ---
  {
    category: "Hikes", id: "emerald-lake-trail", name: "Emerald Lake Trail", location: "Rocky Mountain National Park (Estes Park)", difficulty: "Moderate", length: "3.2 miles (round trip)", elevationGain: "605 ft",
    description: "A highly popular and scenic trail in Rocky Mountain National Park. This hike leads you past Nymph Lake and Dream Lake before reaching the stunning Emerald Lake, nestled in a cirque below Hallett Peak. Expect well-maintained, rocky terrain with some uphill sections. Best visited in late spring through early fall. Timed entry permits are often required for RMNP during peak season. Look out for wildflowers in summer and golden aspens in fall. Parking can be challenging; consider using the park's shuttle system.",
    image: "", latitude: 40.3129, longitude: -105.6429,
  },
  {
    category: "Hikes", id: "manitou-incline", name: "Manitou Incline", location: "Manitou Springs", difficulty: "Difficult", length: "0.88 miles (one way)", elevationGain: "2,000 ft",
    description: "An extreme and challenging hike consisting of nearly 2,744 steps up an old railway bed. It's a relentless uphill climb, gaining 2,000 feet in less than a mile. Offers panoramic views of Colorado Springs and the surrounding mountains. Reservations are required. It's a strenuous workout, so be prepared with plenty of water, appropriate footwear, and consider your fitness level. The descent is typically via the Barr Trail.",
    image: "", latitude: 38.8647, longitude: -104.9125,
  },
  {
    category: "Hikes", id: "garden-of-the-gods", name: "Garden of the Gods Perimeter Trail", location: "Colorado Springs", difficulty: "Easy", length: "3 miles (loop)", elevationGain: "250 ft",
    description: "A relatively flat and easy trail offering panoramic views of the iconic red rock formations. This paved and accessible loop is perfect for all skill levels and offers stunning photo opportunities of the unique sandstone spires against the backdrop of Pikes Peak. Dogs on leash are welcome. The park is free to enter and has a visitor center with exhibits.",
    image: "", latitude: 38.8789, longitude: -104.8698,
  },
  {
    category: "Hikes", id: "grays-torreys-peaks", name: "Grays and Torreys Peaks", location: "Front Range (Georgetown)", difficulty: "Difficult", length: "8 miles (round trip)", elevationGain: "3,000 ft",
    description: "Two of Colorado's most accessible 14ers (peaks over 14,000 feet) via the same trailhead. This challenging hike offers stunning summit views of the Continental Divide. Start early to avoid afternoon thunderstorms. The trail is rocky and exposed above treeline, requiring good physical condition and proper gear. The trailhead is accessible via a rough 4WD road, or you can hike an additional 3 miles each way from the lower parking lot.",
    image: "", latitude: 39.6422, longitude: -105.8142,
  },
  {
    category: "Hikes", id: "chautauqua-trail", name: "Chautauqua Trail", location: "Boulder", difficulty: "Moderate", length: "2.6 miles (round trip)", elevationGain: "600 ft",
    description: "A classic Boulder hike at the base of the iconic Flatirons. This popular trail offers beautiful views of the city and the dramatic rock formations. It's a well-maintained dirt path, but can be steep in sections. Ideal for a quick escape into nature close to the city. Parking can be limited, especially on weekends; consider using public transport or the free shuttle.",
    image: "", latitude: 40.0051, longitude: -105.2818,
  },
  {
    category: "Hikes", id: "hanging-lake-trail", name: "Hanging Lake Trail", location: "Glenwood Canyon", difficulty: "Moderate", length: "2.4 miles (round trip)", elevationGain: "1,000 ft",
    description: "A unique and incredibly beautiful trail leading to a pristine, turquoise lake with multiple waterfalls cascading into it. Due to its popularity and fragile ecosystem, a permit and shuttle reservation are required to access this trail. The hike is steep and rocky in sections, but the reward is one of Colorado's most breathtaking natural wonders. No dogs allowed.",
    image: "", latitude: 39.5961, longitude: -107.2023,
  },
  {
    category: "Hikes", id: "quandary-peak", name: "Quandary Peak", location: "Breckenridge", difficulty: "Difficult", length: "6.7 miles (round trip)", elevationGain: "3,300 ft",
    description: "One of Colorado's most popular 14ers (peaks over 14,000 feet), known for its relatively straightforward route and stunning panoramic views from the summit. The standard route is a class 1-2 hike, making it a good choice for those new to 14ers. Start early to avoid afternoon thunderstorms. Expect rocky terrain and exposure above treeline. Reservations for parking or shuttle might be required during peak season.",
    image: "", latitude: 39.3975, longitude: -106.1064,
  },
  {
    category: "Hikes", id: "bear-lake-loop", name: "Bear Lake Loop", location: "Rocky Mountain National Park (Estes Park)", difficulty: "Easy", length: "0.6 miles (loop)", elevationGain: "45 ft",
    description: "A very accessible and scenic loop around Bear Lake, perfect for a short stroll with beautiful reflections of Hallett Peak and Longs Peak. This paved and boardwalk trail is ideal for families and those seeking an easy, picturesque walk. It's a popular starting point for many other trails in RMNP. Timed entry permits are often required for RMNP during peak season.",
    image: "", latitude: 40.3130, longitude: -105.6475,
  },
  {
    category: "Hikes", id: "royal-arch-trail", name: "Royal Arch Trail", location: "Boulder", difficulty: "Difficult", length: "3.5 miles (round trip)", elevationGain: "1,400 ft",
    description: "A challenging and steep hike to a natural stone arch with great views of Boulder and the surrounding area, including the iconic Flatirons. The trail involves significant elevation gain over a short distance and can be rocky. It's a rewarding workout with a unique geological formation as its centerpiece. Parking can be challenging near the trailhead; consider alternative transportation.",
    image: "", latitude: 40.0051, longitude: -105.2818,
  },
  {
    category: "Hikes", id: "sky-pond-trail", name: "Sky Pond Trail", location: "Rocky Mountain National Park (Estes Park)", difficulty: "Difficult", length: "9.5 miles (round trip)", elevationGain: "1,780 ft",
    description: "A strenuous but incredibly rewarding hike through multiple alpine lakes (Alberta Falls, The Loch, Lake of Glass) and a scramble up a waterfall (Timberline Falls) to reach the stunning Sky Pond. This trail offers some of the most dramatic scenery in RMNP, including waterfalls, pristine lakes, and towering peaks. Requires good fitness and comfort with rock scrambling. Timed entry permits are often required for RMNP during peak season.",
    image: "", latitude: 40.3129, longitude: -105.6429,
  },
  {
    category: "Hikes", id: "herman-gulch", name: "Herman Gulch Trail", location: "Silver Plume", difficulty: "Moderate", length: "7.2 miles (round trip)", elevationGain: "1,700 ft",
    description: "A popular trail leading to an alpine lake, known for its vibrant wildflowers in summer and stunning mountain views. The trail follows a creek for much of the way, offering a pleasant ascent through forests and open meadows. It's a great option for a moderate day hike in the high country, accessible from I-70. Be prepared for changing weather conditions.",
    image: "", latitude: 39.7890, longitude: -105.8670,
  },
  {
    category: "Hikes", id: "st-marys-glacier", name: "St. Mary's Glacier", location: "Idaho Springs", difficulty: "Moderate", length: "1.6 miles (round trip)", elevationGain: "700 ft",
    description: "A short but steep hike to a beautiful alpine lake and a permanent snowfield (often referred to as a glacier). This popular spot offers year-round recreation, including hiking, snowshoeing, and even skiing/snowboarding on the snowfield. The trail is rocky and can be slippery. A parking fee is typically required. Great for a quick mountain escape close to Denver.",
    image: "", latitude: 39.8140, longitude: -105.6700,
  },
  {
    category: "Hikes", id: "lost-lake-hessie", name: "Lost Lake via Hessie Trail", location: "Eldora", difficulty: "Easy", length: "4.0 miles (round trip)", elevationGain: "600 ft",
    description: "A scenic hike to a beautiful sub-alpine lake, popular for families and those seeking a relatively easy trail with rewarding views. The trail winds through forest and meadows. During peak season (summer/fall), shuttle access is often required from Nederland to the Hessie Trailhead due to limited parking. Check current regulations before you go.",
    image: "", latitude: 39.9920, longitude: -105.5900,
  },
  {
    category: "Hikes", id: "chicago-lakes", name: "Chicago Lakes Trail", location: "Mount Evans Wilderness", difficulty: "Difficult", length: "9.0 miles (round trip)", elevationGain: "2,000 ft",
    description: "A challenging hike to two stunning alpine lakes (Lower and Upper Chicago Lake) nestled below the towering peaks of Mount Evans and Mount Spalding. This trail offers rugged mountain scenery, waterfalls, and a true wilderness experience. The elevation gain is significant, and the trail can be rocky. Start early to avoid afternoon thunderstorms, especially at higher elevations.",
    image: "", latitude: 39.6300, longitude: -105.6300,
  },
  {
    category: "Hikes", id: "blue-lake-brainard", name: "Blue Lake (Brainard Lake Rec Area)", location: "Ward", difficulty: "Moderate", length: "5.0 miles (round trip)", elevationGain: "900 ft",
    description: "A beautiful hike in the Brainard Lake Recreation Area, leading to a pristine alpine lake with classic Rocky Mountain views. The trail passes Long Lake and offers stunning reflections of the surrounding peaks. This area is very popular, and a timed entry permit is often required for vehicle access during peak season. Excellent for wildflowers in summer and fall colors.",
    image: "", latitude: 40.0600, longitude: -105.5900,
  },
  {
    category: "Hikes", id: "chief-mountain", name: "Chief Mountain Trail", location: "Idaho Springs", difficulty: "Easy", length: "3.0 miles (round trip)", elevationGain: "1,000 ft",
    description: "A relatively short hike to a summit offering panoramic views of the Front Range and Continental Divide. Despite being 'easy' in length, it has a good elevation gain, making it a satisfying workout with big rewards. The trail is well-defined and offers great views from the start. A good option for a quick mountain summit experience without extreme distances.",
    image: "", latitude: 39.7500, longitude: -105.5700,
  },
  {
    category: "Hikes", id: "lair-o-the-bear", name: "Lair O' the Bear Park", location: "Idledale", difficulty: "Easy", length: "4.0 miles (loop)", elevationGain: "300 ft",
    description: "A popular park with various trails along Bear Creek, suitable for families, dog walkers, and easy walks. The main trail follows the creek, offering shaded sections and pleasant riverside scenery. It's a great spot for a leisurely outdoor experience close to Denver. Can get busy on weekends.",
    image: "", latitude: 39.6900, longitude: -105.3400,
  },
  {
    category: "Hikes", id: "bergen-peak", name: "Bergen Peak Trail", location: "Evergreen", difficulty: "Difficult", length: "10.0 miles (round trip)", elevationGain: "2,000 ft",
    description: "A challenging climb to Bergen Peak with rewarding views of the surrounding foothills and mountains, including distant views of Denver. The trail offers both loop and out-and-back options, winding through forests and open areas. It's a good endurance hike with a significant elevation gain, providing a solid workout and expansive vistas.",
    image: "", latitude: 39.6700, longitude: -105.4100,
  },
  {
    category: "Hikes", id: "red-rocks-trading-post", name: "Red Rocks Trading Post Trail", location: "Morrison", difficulty: "Easy", length: "1.4 miles (loop)", elevationGain: "300 ft",
    description: "A short, scenic loop around the iconic red rock formations of Red Rocks Park and Amphitheatre. This easy trail is perfect for a quick walk to admire the unique geology and the famous concert venue. It's generally flat with some gentle slopes, making it accessible for most. Combine it with a visit to the amphitheater for a full experience.",
    image: "", latitude: 39.6650, longitude: -105.2050,
  },
  {
    category: "Hikes", id: "lake-isabelle", name: "Lake Isabelle Trail", location: "Brainard Lake Recreation Area (Ward)", difficulty: "Moderate", length: "4.2 miles (round trip)", elevationGain: "400 ft",
    description: "A stunning hike to Lake Isabelle, known for its beautiful reflections of the Indian Peaks and vibrant wildflowers in summer. This trail is a highlight of the Brainard Lake Recreation Area. It's generally moderate with some rocky sections. Timed entry permits are often required for vehicle access during peak season. A popular spot for photography and enjoying alpine scenery.",
    image: "", latitude: 40.0600, longitude: -105.5900,
  },
  {
    category: "Hikes", id: "chasm-lake", name: "Chasm Lake Trail", location: "Rocky Mountain National Park (Longs Peak)", difficulty: "Difficult", length: "8.5 miles (round trip)", elevationGain: "2,500 ft",
    description: "A challenging and highly rewarding hike to a glacial lake nestled below the dramatic east face of Longs Peak. This trail offers incredible views of alpine landscapes, waterfalls, and diverse ecosystems. It's a strenuous climb, with sections above treeline and potential snowfields even in summer. Requires good fitness, proper gear, and an early start. Timed entry permits are often required for RMNP during peak season.",
    image: "", latitude: 40.2760, longitude: -105.6100,
  },
  {
    category: "Hikes", id: "mohawk-lakes", name: "Mohawk Lakes Trail", location: "Breckenridge", difficulty: "Moderate", length: "6.7 miles (round trip)", elevationGain: "1,700 ft",
    description: "A popular trail featuring multiple alpine lakes, cascading waterfalls, historic mining cabins, and stunning mountain views. The trail offers a mix of forest paths and rocky ascents. You can choose to hike to lower or upper lakes depending on your desired length and difficulty. A fantastic representation of high-alpine Colorado scenery, especially vibrant in summer and fall.",
    image: "", latitude: 39.4200, longitude: -106.0700,
  },
  {
    category: "Hikes", id: "booth-falls", name: "Booth Falls Trail", location: "Vail", difficulty: "Difficult", length: "10.0 miles (round trip to lake)", elevationGain: "3,000 ft",
    description: "A strenuous hike known for its beautiful waterfall (Booth Falls) and continuation to Booth Lake in a stunning alpine basin. The lower section to the falls is popular and moderate, but continuing to the lake involves significant elevation gain and rocky terrain. Offers incredible wildflowers in summer. Parking can be challenging at the trailhead; arrive early.",
    image: "", latitude: 39.6500, longitude: -106.3500,
  },
  {
    category: "Hikes", id: "lily-mountain", name: "Lily Mountain Trail", location: "Estes Park", difficulty: "Moderate", length: "3.5 miles (round trip)", elevationGain: "1,000 ft",
    description: "A relatively short hike to a summit offering 360-degree views of Rocky Mountain National Park and the surrounding area. The trail is a steady uphill climb through forested areas, opening up to panoramic vistas at the top. It's a great option for a rewarding hike without the commitment of a longer, more challenging peak. Accessible year-round, though snowshoes may be needed in winter.",
    image: "", latitude: 40.3500, longitude: -105.5700,
  },
  {
    category: "Hikes", id: "mount-bierstadt", name: "Mount Bierstadt", location: "Georgetown (Guanella Pass)", difficulty: "Moderate", length: "7.0 miles (round trip)", elevationGain: "2,850 ft",
    description: "One of the most accessible 14ers, offering a straightforward climb and excellent views from the summit. The trail starts from Guanella Pass, making for a high-elevation start. Expect rocky terrain and exposure above treeline. Popular for first-time 14er climbers. Start early to avoid crowds and afternoon thunderstorms. The road to Guanella Pass is seasonal.",
    image: "", latitude: 39.5820, longitude: -105.6000,
  },
  {
    category: "Hikes", id: "mount-elbert", name: "Mount Elbert", location: "Leadville", difficulty: "Difficult", length: "9.7 miles (round trip)", elevationGain: "4,500 ft",
    description: "The highest peak in Colorado and the entire Rocky Mountains, Mount Elbert offers a challenging but highly rewarding ascent. The standard route is a long, sustained climb with significant elevation gain, mostly above treeline. Expect rocky and exposed terrain. Requires excellent fitness and preparation for high-altitude conditions. Views from the summit are expansive and truly unforgettable.",
    image: "", latitude: 39.1170, longitude: -106.4450,
  },
  {
    category: "Hikes", id: "pikes-peak", name: "Pikes Peak (Barr Trail)", location: "Colorado Springs", difficulty: "Difficult", length: "26.0 miles (round trip)", elevationGain: "7,600 ft",
    description: "A legendary and extremely challenging hike to the summit of Pikes Peak, one of Colorado's most famous 14ers. The Barr Trail is a continuous uphill climb, taking most hikers 10-14 hours round trip. It passes through diverse ecosystems, from forests to alpine tundra. Requires extensive preparation, endurance, and proper gear. Many hikers choose to hike up and take the Pikes Peak Cog Railway or drive down.",
    image: "", latitude: 38.8400, longitude: -105.0440,
  },
  {
    category: "Hikes", id: "maroon-bells", name: "Maroon Bells Scenic Loop", location: "Aspen", difficulty: "Easy", length: "1.5 miles (loop)", elevationGain: "160 ft",
    description: "A short, incredibly scenic loop around Maroon Lake with iconic views of the Maroon Bells peaks, often considered the most photographed mountains in Colorado. This easy, relatively flat trail offers stunning reflections of the peaks in the lake. Vehicle access is restricted during peak season, requiring a shuttle reservation from Aspen Highlands. Ideal for families and photographers.",
    image: "", latitude: 39.0980, longitude: -106.9400,
  },
  {
    category: "Hikes", id: "mount-galbraith", name: "Mount Galbraith Loop", location: "Golden", difficulty: "Moderate", length: "4.0 miles (loop)", elevationGain: "1,000 ft",
    description: "A popular loop trail near Golden with good views of the surrounding foothills and the city of Golden. The trail offers a steady climb through open space, providing a good workout with rewarding vistas. It's a great option for a moderate hike close to the Denver metro area. Can be busy on weekends.",
    image: "", latitude: 39.7740, longitude: -105.2400,
  },
  {
    category: "Hikes", id: "dakota-ridge-trail", name: "Dakota Ridge Trail", location: "Morrison", difficulty: "Moderate", length: "5.0 miles (out & back)", elevationGain: "1,050 ft",
    description: "A challenging trail along a hogback ridge with panoramic views of Red Rocks Park and the Denver skyline. The trail is exposed and can be steep in sections, offering a good workout. It's a popular spot for trail running and mountain biking in addition to hiking. Best visited during cooler months as there is little shade.",
    image: "", latitude: 39.6700, longitude: -105.1800,
  },
  {
    category: "Hikes", id: "elk-falls", name: "Elk Falls Overlook Trail", location: "Staunton State Park", difficulty: "Moderate", length: "11.0 miles (lollipop)", elevationGain: "1,500 ft",
    description: "A long hike to Colorado's newest state park's impressive Elk Falls, the tallest waterfall in Staunton State Park. The trail offers diverse scenery, including forests, meadows, and rock formations. It's a longer commitment but provides a rewarding destination. Be prepared for a full day hike and varying terrain.",
    image: "", latitude: 39.5200, longitude: -105.4000,
  },
  {
    category: "Hikes", id: "devils-head-lookout", name: "Devil's Head Lookout Trail", location: "Sedalia", difficulty: "Moderate", length: "2.7 miles (out & back)", elevationGain: "865 ft",
    description: "A short but steep hike to a historic fire lookout tower with incredible 360-degree views of the Front Range. The final ascent involves climbing a series of stairs to the lookout. This is a popular and rewarding hike, offering big views for a relatively short distance. Check opening dates as the lookout is staffed seasonally.",
    image: "", latitude: 39.3300, longitude: -105.0800,
  },
  {
    category: "Hikes", id: "mayflower-gulch", name: "Mayflower Gulch Trail", location: "Copper Mountain", difficulty: "Moderate", length: "3.5 miles (out & back)", elevationGain: "700 ft",
    description: "A beautiful hike through an old mining area to a stunning alpine basin, especially vibrant with wildflowers in summer and golden aspens in fall. The trail follows an old mining road, making for a relatively easy grade until the final push into the basin. Explore historic cabins and enjoy panoramic views of surrounding peaks. Popular for photography.",
    image: "", latitude: 39.4600, longitude: -106.1300,
  },
  {
    category: "Hikes", id: "lake-haiyaha", name: "Lake Haiyaha Trail", location: "Rocky Mountain National Park (Estes Park)", difficulty: "Moderate", length: "4.2 miles (round trip)", elevationGain: "745 ft",
    description: "A scenic hike to a unique, turquoise-colored lake, accessible from Bear Lake Road. The lake's distinctive color comes from rock flour suspended in the water. The trail passes Nymph Lake and Dream Lake, offering varied scenery. The final approach to Lake Haiyaha involves some boulder scrambling. Timed entry permits are often required for RMNP during peak season.",
    image: "", latitude: 40.3100, longitude: -105.6400,
  },
  {
    category: "Hikes", id: "mills-lake", name: "Mills Lake Trail", location: "Rocky Mountain National Park (Estes Park)", difficulty: "Moderate", length: "5.0 miles (round trip)", elevationGain: "850 ft",
    description: "A rewarding hike to a picturesque alpine lake with stunning views of Longs Peak and the Keyboard of the Winds. The trail is accessed from the Glacier Gorge Trailhead and passes Alberta Falls and The Loch. It's a classic RMNP hike offering beautiful forest, waterfall, and lake scenery. Timed entry permits are often required for RMNP during peak season.",
    image: "", latitude: 40.3100, longitude: -105.6400,
  },
  {
    category: "Hikes", id: "spruce-mountain", name: "Spruce Mountain Open Space", location: "Larkspur", difficulty: "Moderate", length: "6.0 miles (loop)", elevationGain: "900 ft",
    description: "A loop trail offering expansive views of Colorado's rolling hills and a unique perspective of Pikes Peak. The trail climbs to the top of Spruce Mountain, providing open vistas and a mix of forest and meadow environments. It's a great option for a moderate hike south of Denver, less crowded than some other Front Range trails.",
    image: "", latitude: 39.2300, longitude: -104.8800,
  },
  {
    category: "Hikes", id: "south-rim-roxborough", name: "South Rim Loop Trail (Roxborough)", location: "Littleton", difficulty: "Moderate", length: "3.0 miles (loop)", elevationGain: "400 ft",
    description: "A moderate hike with breathtaking views of Roxborough State Park's dramatic red rock formations. This trail offers close-up views of the park's unique geology, reminiscent of Garden of the Gods but often less crowded. The loop provides varied perspectives and is a great option for a half-day outing. Entry fee required for the state park.",
    image: "", latitude: 39.4000, longitude: -105.0500,
  },
  {
    category: "Hikes", id: "zirkel-circle", name: "Zirkel Circle Trail", location: "Steamboat Springs", difficulty: "Difficult", length: "11.0 miles (loop)", elevationGain: "2,000 ft",
    description: "A challenging and incredibly scenic loop through the Mount Zirkel Wilderness, with stunning alpine views, pristine lakes, and diverse ecosystems. This is a true wilderness experience, requiring good navigation skills and preparedness for remote conditions. Best done in summer after snowmelt. Offers spectacular wildflowers and solitude.",
    image: "", latitude: 40.8000, longitude: -106.6700,
  },
  {
    category: "Hikes", id: "mount-rosa", name: "Mount Rosa Trail", location: "Colorado Springs", difficulty: "Difficult", length: "15.0 miles (round trip)", elevationGain: "4,000 ft",
    description: "A challenging hike with waterfalls and stunning views of Pikes Peak from an 11,500 ft summit. This long and strenuous trail offers a rewarding wilderness experience near Colorado Springs. Be prepared for significant elevation gain and changing weather conditions at higher altitudes. Offers great panoramic views of the region.",
    image: "", latitude: 38.8000, longitude: -104.8700,
  },
  {
    category: "Hikes", id: "music-pass-sand-creek", name: "Music Pass to Sand Creek Lakes", location: "Westcliffe", difficulty: "Difficult", length: "10.0 miles (round trip)", elevationGain: "2,400 ft",
    description: "A tough but rewarding hike to pristine alpine lakes in the Sangre de Cristo Mountains. The trail to Music Pass is steep, but the views from the pass into the Sand Creek drainage are spectacular. Continuing to the lakes offers a remote and beautiful high-alpine experience. Best for experienced hikers due to elevation and rugged terrain.",
    image: "", latitude: 37.9800, longitude: -105.5000,
  },
  {
    category: "Hikes", id: "willow-lakes", name: "Willow Lakes Trail", location: "Silverthorne", difficulty: "Moderate", length: "9.0 miles (round trip)", elevationGain: "1,500 ft",
    description: "A beautiful hike in the Gore Range leading to breathtaking alpine lakes surrounded by rugged peaks. This trail offers a true wilderness feel with stunning scenery, including waterfalls and diverse flora. It's a longer moderate hike, providing a full day's adventure in a less-trafficked area compared to some other popular spots.",
    image: "", latitude: 39.6800, longitude: -106.0700,
  },
  {
    category: "Hikes", id: "arthurs-rock", name: "Arthur's Rock Trail", location: "Lory State Park (Fort Collins)", difficulty: "Moderate", length: "3.4 miles (round trip)", elevationGain: "1,000 ft",
    description: "A popular and rewarding hike to Arthur's Rock with fantastic views of Horsetooth Reservoir and the Fort Collins area. The trail is a steady climb through open space and forested sections. It's a great option for a half-day hike with a clear destination and panoramic payoff. State park entry fee required.",
    image: "uploaded:arthur's rock.jpg-f8f74b64-5100-4e26-95bc-bd0cf8079bbb", latitude: 40.5900, longitude: -105.2400,
  },
  {
    category: "Hikes", id: "coyote-ridge", name: "Coyote Ridge Trail", location: "Fort Collins", difficulty: "Easy", length: "4.1 miles (loop)", elevationGain: "565 ft",
    description: "A scenic trail known for wildlife viewing, especially prairie dogs, in the foothills near Fort Collins. The trail offers gentle rolling hills and open views of the plains and mountains. It's an easy and accessible option for a leisurely walk or run, popular with families and dog walkers. No entry fee.",
    image: "", latitude: 40.4900, longitude: -105.1500,
  },
  {
    category: "Hikes", id: "greyrock", name: "Greyrock Trail", location: "Poudre Canyon (Fort Collins)", difficulty: "Difficult", length: "7.4 miles (loop)", elevationGain: "2,000 ft",
    description: "A challenging but popular loop hike with stunning views of the Poudre Canyon and surrounding mountains. The trail climbs steadily to the base of Greyrock Mountain, offering a good workout and panoramic vistas. It's a rewarding hike for those seeking a more strenuous outing in the Fort Collins area. Be prepared for rocky sections and sun exposure.",
    image: "", latitude: 40.7000, longitude: -105.3000,
  },
  {
    category: "Hikes", id: "monument-canyon", name: "Monument Canyon Trail", location: "Colorado National Monument (Grand Junction)", difficulty: "Moderate", length: "7.2 miles (loop)", elevationGain: "961 ft",
    description: "A classic hike in Colorado National Monument with spectacular red rock formations and canyon views. The trail descends into the canyon, winding among towering sandstone monoliths like Independence Monument. Offers unique desert scenery and geological wonders. Best hiked in cooler months. Park entry fee required.",
    image: "", latitude: 39.0400, longitude: -108.7300,
  },
  {
    category: "Hikes", id: "liberty-cap", name: "Liberty Cap Trail", location: "Colorado National Monument (Grand Junction)", difficulty: "Difficult", length: "10.0 miles (out & back)", elevationGain: "2,000 ft",
    description: "A strenuous hike to Liberty Cap, offering expansive views of the Grand Valley and surrounding canyons within Colorado National Monument. The trail involves a significant climb from the valley floor to the rim. Provides a challenging workout and breathtaking panoramic vistas. Best hiked in cooler temperatures due to sun exposure.",
    image: "", latitude: 39.0500, longitude: -108.6800,
  },
  {
    category: "Hikes", id: "longs-peak-keyhole", name: "Longs Peak (Keyhole Route)", location: "Rocky Mountain National Park", difficulty: "Difficult", length: "14.5 miles (round trip)", elevationGain: "5,100 ft",
    description: "Colorado's most iconic and challenging 14er, the Keyhole Route is a true mountaineering experience, not just a hike. It involves significant scrambling, exposure, and route-finding above treeline. Requires excellent physical condition, experience with exposure, and an alpine start (typically before dawn). Permits are required for overnight trips. The summit offers unparalleled views.",
    image: "", latitude: 40.2760, longitude: -105.6100,
  },
  {
    category: "Hikes", id: "mount-blue-sky", name: "Mount Blue Sky (Mount Evans)", location: "Idaho Springs", difficulty: "Difficult", length: "5.5 miles (round trip from Summit Lake)", elevationGain: "2,000 ft",
    description: "One of the Front Range 14ers, Mount Blue Sky (formerly Mount Evans) is unique due to its accessible summit via the highest paved road in North America. The hike from Summit Lake to the peak is a challenging but relatively short alpine scramble. Offers stunning views of alpine lakes, tundra, and distant peaks. The road is seasonal and requires a timed entry reservation.",
    image: "", latitude: 39.5800, longitude: -105.6400,
  },
  {
    category: "Hikes", id: "mount-massive", name: "Mount Massive", location: "Leadville", difficulty: "Difficult", length: "14.5 miles (round trip)", elevationGain: "4,500 ft",
    description: "Colorado's second-highest peak, Mount Massive offers a long but rewarding climb with expansive views of the Sawatch Range. The standard route is a sustained uphill hike, mostly above treeline, with some rocky sections. Requires excellent endurance and preparedness for high-altitude conditions. The summit is a vast plateau, providing a unique sense of accomplishment.",
    image: "", latitude: 39.1870, longitude: -106.4760,
  },
  {
    category: "Hikes", id: "mount-sherman", name: "Mount Sherman", location: "Fairplay", difficulty: "Moderate", length: "5.25 miles (round trip)", elevationGain: "2,100 ft",
    description: "An accessible 14er, often climbed via an old mining road, with historic ruins and good views of the Mosquito Range. This is considered one of the easier 14ers, making it a popular choice for those looking to experience a high-altitude summit without extreme technical challenges. The trail is rocky and exposed. Start early to avoid afternoon storms.",
    image: "", latitude: 39.2250, longitude: -106.1780,
  },
  {
    category: "Hikes", id: "ice-lake-trail", name: "Ice Lake Trail", location: "Silverton", difficulty: "Difficult", length: "8.0 miles (round trip)", elevationGain: "3,000 ft",
    description: "A highly popular and incredibly scenic hike to a stunning turquoise alpine lake in the San Juan Mountains. The trail is a relentless climb through forests and meadows, culminating in a breathtaking basin with multiple vibrant blue lakes. It's a challenging hike due to the elevation gain but offers unparalleled beauty. Can be very crowded; arrive early.",
    image: "", latitude: 37.8900, longitude: -107.7800,
  },
  {
    category: "Hikes", id: "capitol-peak", name: "Capitol Peak", location: "Snowmass Village", difficulty: "Difficult", length: "17.0 miles (round trip)", elevationGain: "5,300 ft",
    description: "Considered one of Colorado's most challenging 14ers, known for its exposure and the infamous 'Knife Edge' traverse. This is a technical climb requiring advanced mountaineering skills, rock climbing experience, and comfort with extreme exposure. It's a serious undertaking, typically done as an overnight backpacking trip. Not for beginners.",
    image: "", latitude: 39.0800, longitude: -107.0800,
  },

  // --- Rivers and Streams to Fly Fish ---
  {
    category: "Fly Fishing", id: "arkansas-river-pueblo", name: "Arkansas River (Pueblo)", location: "Pueblo", streamType: "Tailwater",
    description: "Known for its Gold Medal Waters, the Arkansas River near Pueblo offers excellent trout fishing year-round, particularly for brown and rainbow trout. This tailwater section below Pueblo Reservoir provides consistent flows and abundant insect life, making it a productive fishery. Popular for nymphing and streamer fishing. Access points are plentiful along the river. Expect clear, cold water and often technical fishing.",
    image: "", latitude: 38.2700, longitude: -104.6200,
  },
  {
    category: "Fly Fishing", id: "south-platte-deckers", name: "South Platte River (Deckers)", location: "Deckers", streamType: "Tailwater",
    description: "Famous for its large, selective trout and challenging fly fishing, the Deckers section of the South Platte River is a highly popular Gold Medal Water. It's a classic tailwater, known for its technical dry fly fishing, especially during prolific hatches. Expect clear, cold water and wary fish. Weekends can be crowded, so consider a weekday visit for more solitude. Access is via various public easements. Target species include large rainbow and brown trout.",
    image: "", latitude: 39.2300, longitude: -105.2400,
  },
  {
    category: "Fly Fishing", id: "cache-la-poudre-river", name: "Cache la Poudre River", location: "Fort Collins", streamType: "Freestone",
    description: "Colorado's only Wild & Scenic River, the Cache la Poudre offers diverse fishing opportunities from easy access near Fort Collins to remote sections in the canyon. It's a freestone river with a mix of riffles, runs, and pools, holding brown and rainbow trout. Ideal for wade fishing with dry flies, nymphs, and streamers depending on the season. Offers beautiful canyon scenery and varying flows with snowmelt and rain.",
    image: "", latitude: 40.6300, longitude: -105.1000,
  },
  {
    category: "Fly Fishing", id: "fryingpan-river", name: "Fryingpan River", location: "Basalt", streamType: "Tailwater",
    description: "A premier tailwater fishery below Ruedi Reservoir, the Fryingpan River is renowned for its large, selective trout, particularly 'monster' rainbows and browns. This Gold Medal Water is known for its incredibly clear water and consistent flows, making for challenging but rewarding fishing. Technical nymphing and midge fishing are often key due to the abundant small insect life. Access points are well-marked along the scenic Fryingpan Road. This is a highly technical fishery.",
    image: "", latitude: 39.2300, longitude: -107.0700,
  },
  {
    category: "Fly Fishing", id: "roaring-fork-river", name: "Roaring Fork River", location: "Aspen to Glenwood Springs", streamType: "Freestone/Tailwater",
    description: "A diverse river offering excellent fishing for brown and rainbow trout. It transitions from high-alpine freestone sections near Aspen to a productive tailwater below Basalt. The Roaring Fork is a Gold Medal Water in many sections, providing opportunities for dry fly, nymph, and streamer fishing. Its accessibility and varied character make it a favorite for many anglers. The tailwater section offers more consistent conditions, while freestone sections are more dependent on runoff.",
    image: "", latitude: 39.4500, longitude: -107.0000,
  },
  {
    category: "Fly Fishing", id: "boulder-creek", name: "Boulder Creek", location: "Boulder", streamType: "Freestone",
    description: "Flowing directly through the city of Boulder, this accessible freestone creek offers surprising opportunities for brown and rainbow trout. While close to urban areas, it still provides a fun challenge for anglers. Best fished during lower flows in late spring through fall. Offers a mix of pocket water, riffles, and small pools. Popular for short outings and quick fishing fixes right in town.",
    image: "", latitude: 40.0176, longitude: -105.2797,
  },
  {
    category: "Fly Fishing", id: "south-boulder-creek", name: "South Boulder Creek (below Gross Reservoir)", location: "Boulder Canyon", streamType: "Tailwater",
    description: "This section of South Boulder Creek is a prime tailwater fishery, offering consistent flows and cold water released from Gross Reservoir. It's known for healthy populations of brown and rainbow trout, often of good size. The technical nature of the fishing, combined with beautiful canyon scenery, makes it a rewarding experience. Nymphing is particularly effective here, especially with small midge and mayfly patterns.",
    image: "", latitude: 39.9800, longitude: -105.3700,
  },
  {
    category: "Fly Fishing", id: "big-thompson-river", name: "Big Thompson River (near Estes Park)", location: "Estes Park / Loveland", streamType: "Freestone/Tailwater",
    description: "The Big Thompson River offers both freestone and tailwater characteristics. Upstream near Estes Park, it's a classic freestone river influenced by snowmelt, holding wild trout in a scenic canyon. Below Olympus Dam near Loveland, it becomes a productive tailwater, offering more consistent flows and larger, often stocked, trout. Both sections hold brown and rainbow trout, with various access points and diverse fishing opportunities.",
    image: "", latitude: 40.3772, longitude: -105.5172,
  },
  {
    category: "Fly Fishing", id: "st-vrain-creek", name: "St. Vrain Creek (North, Middle, South Forks)", location: "Lyons / Rocky Mountains", streamType: "Freestone",
    description: "The North, Middle, and South Forks of St. Vrain Creek are classic freestone streams originating in the high mountains. They offer excellent opportunities for wild brown and brook trout in a beautiful, rugged setting. These creeks are highly dependent on snowmelt, so flows can vary significantly. Ideal for small stream tactics, dry fly fishing, and exploring remote pockets. Access often involves hiking into the national forest.",
    image: "", latitude: 40.2300, longitude: -105.4000,
  },
  {
    category: "Fly Fishing", id: "south-platte-dream-stream", name: "South Platte River (Dream Stream)", location: "Fairplay", streamType: "Tailwater",
    description: "A highly renowned Gold Medal Water, the 'Dream Stream' is a specific section of the South Platte River located between Spinney Mountain Reservoir and Eleven Mile Reservoir. This tailwater is famous for its trophy-sized brown and rainbow trout, especially during spawning seasons. It's a wide, open meadow stream requiring long casts and technical presentations. Very popular and can be crowded, but the potential for huge fish is a major draw for serious anglers.",
    image: "", latitude: 38.9800, longitude: -105.5000,
  },
  {
    category: "Fly Fishing", id: "taylor-river", name: "Taylor River (Trophy Section)", location: "Almont", streamType: "Tailwater",
    description: "The Taylor River below Taylor Park Reservoir is a legendary Gold Medal tailwater, famous for its massive, often 20+ inch, rainbow and brown trout. This section is a highly technical fishery, requiring precise presentations and small flies due to the abundant midge and mayfly hatches. The consistent cold water and abundant food sources allow fish to grow to exceptional sizes. It's a challenging but incredibly rewarding experience for serious fly anglers. Often crowded due to its reputation.",
    image: "", latitude: 38.7400, longitude: -106.6000,
  },
  {
    category: "Fly Fishing", id: "blue-river-silverthorne", name: "Blue River (Silverthorne Section)", location: "Silverthorne", streamType: "Tailwater",
    description: "The Blue River through Silverthorne is a popular and easily accessible Gold Medal tailwater, flowing directly out of Dillon Reservoir. It offers consistent flows and cold water, supporting a healthy population of brown and rainbow trout. Can be very busy, especially near town, but offers good fishing for those willing to navigate the crowds. Nymphing is generally productive, and dry fly opportunities exist during hatches. Convenient access from I-70.",
    image: "", latitude: 39.6200, longitude: -106.0700,
  },
  {
    category: "Fly Fishing", id: "arkansas-river-salida", name: "Arkansas River (Salida/Buena Vista)", location: "Salida / Buena Vista", streamType: "Freestone",
    description: "The upper Arkansas River, particularly the sections near Salida and Buena Vista, is a classic freestone river and a designated Gold Medal Water. It offers diverse fishing for brown and rainbow trout in a beautiful canyon setting. Flows are highly dependent on snowmelt, making spring runoff challenging, but summer and fall offer excellent wade and float fishing opportunities. Known for its varied water types, from fast riffles to deep pools, and popular for rafting as well.",
    image: "", latitude: 38.8000, longitude: -106.1000,
  },
  {
    category: "Fly Fishing", id: "eagle-river", name: "Eagle River", location: "Vail Valley", streamType: "Freestone",
    description: "The Eagle River is a beautiful freestone river that offers excellent fishing for brown and rainbow trout. It's known for its consistent flows throughout the summer and fall, making it a reliable fishery. The river provides a mix of pocket water, riffles, and runs, suitable for various fly fishing techniques, including dry flies and nymphs. Access is generally good along its course, and it's a great option for a less pressured freestone experience.",
    image: "", latitude: 39.6500, longitude: -106.5000,
  },
  {
    category: "Fly Fishing", id: "gunnison-river", name: "Gunnison River", location: "Gunnison / Montrose", streamType: "Freestone/Tailwater",
    description: "The Gunnison River is a significant Colorado river with varied characteristics. Upstream of Blue Mesa Reservoir, it's a freestone river. Below Blue Mesa Dam, it becomes a powerful tailwater, including the famous Black Canyon of the Gunnison section (which requires a wilderness permit and is highly technical, often floated). The lower sections offer excellent fishing for large brown and rainbow trout, both wade and float opportunities. Its diverse nature provides options for all skill levels and preferences.",
    image: "", latitude: 38.5500, longitude: -107.0000,
  },
  {
    category: "Fly Fishing", id: "crystal-river", name: "Crystal River", location: "Carbondale", streamType: "Freestone",
    description: "The Crystal River is a beautiful freestone river flowing through a scenic valley near Carbondale. It offers good fishing for wild brown and rainbow trout in a more intimate setting compared to larger rivers. The river is characterized by pocket water, riffles, and small pools, making it ideal for wade fishing with dry flies and nymphs. Its smaller size often means less pressure and a more peaceful experience, especially in its upper reaches.",
    image: "", latitude: 39.4000, longitude: -107.2000,
  },

  // --- National Parks to See ---
  {
    category: "National Parks", id: "great-sand-dunes-np", name: "Great Sand Dunes National Park", location: "Mosca, CO", difficulty: "Easy to Moderate",
    description: "Home to the tallest sand dunes in North America, this unique national park offers a surreal landscape for hiking, sandboarding, sand sledding, and stargazing. Medano Creek, a seasonal stream, flows at the base of the dunes in late spring/early summer, creating a popular 'beach' experience. Best visited in spring or fall to avoid extreme temperatures. Entry fee required.",
    image: "", latitude: 37.7300, longitude: -105.5500,
  },
  {
    category: "National Parks", id: "mesa-verde-np", name: "Mesa Verde National Park", location: "Mancos, CO", difficulty: "Easy to Moderate",
    description: "Preserves ancestral Puebloan cliff dwellings and archaeological sites, offering a profound glimpse into ancient cultures. Visitors can take ranger-guided tours of iconic dwellings like Cliff Palace and Balcony House (seasonal, reservations recommended). The park also offers scenic drives, overlooks, and hiking trails. A UNESCO World Heritage Site, it's a must-visit for history and archaeology enthusiasts. Entry fee required.",
    image: "", latitude: 37.1800, longitude: -108.4900,
  },
  {
    category: "National Parks", id: "black-canyon-gunnison-np", name: "Black Canyon of the Gunnison NP", location: "Montrose, CO", difficulty: "Difficult",
    description: "A dramatic, deep, and narrow canyon carved by the Gunnison River, offering stunning views from its rim and challenging, unmaintained routes to the river below. The sheer, dark walls make for a visually striking experience. Activities include scenic drives, short rim hikes, and strenuous inner canyon descents (permits required). Best visited in spring/fall. Entry fee required.",
    image: "", latitude: 38.5700, longitude: -107.7200,
  },
  {
    category: "National Parks", id: "arches-np-ut", name: "Arches National Park", location: "Moab, Utah", difficulty: "Easy to Moderate",
    description: "Features over 2,000 natural sandstone arches, including the iconic Delicate Arch, set in a vibrant red rock landscape. Popular activities include scenic drives, short walks to viewpoints, and longer hikes to specific arches. Timed entry reservations are often required during peak season (spring/fall). Known for stunning sunrise and sunset photography. Entry fee required.",
    image: "", latitude: 38.7300, longitude: -109.5900,
  },
  {
    category: "National Parks", id: "canyonlands-np-ut", name: "Canyonlands National Park", location: "Moab, Utah", difficulty: "Easy to Difficult",
    description: "Vast wilderness of canyons, mesas, and buttes, carved by the Colorado and Green rivers. The park is divided into four districts (Island in the Sky, The Needles, The Maze, Rivers), each offering distinct experiences. Island in the Sky is the most accessible for scenic drives and viewpoints. Activities range from easy overlooks to multi-day backpacking trips. Entry fee required.",
    image: "", latitude: 38.2100, longitude: -109.8700,
  },
  {
    category: "National Parks", id: "zion-np-ut", name: "Zion National Park", location: "Springdale, Utah", difficulty: "Easy to Difficult",
    description: "Known for Zion Canyon's massive sandstone cliffs, emerald pools, and the famous Narrows hike (wading through a river in a slot canyon). Offers stunning scenic drives, diverse hiking trails for all levels, and opportunities for canyoneering. Shuttle bus system is mandatory for most of the scenic drive during peak season. Reservations are often required for popular trails. Entry fee required.",
    image: "", latitude: 37.2982, longitude: -113.0263,
  },
  {
    category: "National Parks", id: "grand-canyon-np-az", name: "Grand Canyon National Park", location: "Grand Canyon, Arizona", difficulty: "Easy to Difficult",
    description: "The immense, mile-deep Grand Canyon, a UNESCO World Heritage Site, carved by the Colorado River. Offers breathtaking viewpoints along the South Rim (most accessible) and North Rim (seasonal). Activities include scenic drives, short rim walks, and challenging inner canyon hikes (require significant planning and fitness). Mule rides and rafting trips are also popular. Entry fee required.",
    image: "", latitude: 36.1000, longitude: -112.1000,
  },

  // --- Mountains/Ski Resorts to Ski ---
  {
    category: "Ski Resorts", id: "eldora-ski", name: "Eldora Mountain Resort", location: "Nederland",
    description: "Boulder's closest ski resort, Eldora offers diverse terrain for all skill levels, a dedicated learning area, and extensive Nordic skiing trails. Known for its convenient location and often sunny, less crowded slopes compared to resorts further west. Features 680 acres of skiable terrain, 10 lifts, and a vertical drop of 1,600 feet. Great for a quick day trip from Boulder.",
    image: "", latitude: 39.9400, longitude: -105.5800,
  },
  {
    category: "Ski Resorts", id: "loveland-ski-area", name: "Loveland Ski Area", location: "Georgetown",
    description: "Known for its early openings (often first in Colorado) and abundant natural snow, Loveland offers a friendly, less crowded atmosphere. It's split into two areas: Loveland Basin (main area) and Loveland Valley (beginner area). Features 1,800 acres of skiable terrain, 9 lifts, and a vertical drop of 2,210 feet. Offers free snowcat skiing on The Ridge.",
    image: "", latitude: 39.6800, longitude: -105.8900,
  },
  {
    category: "Ski Resorts", id: "arapahoe-basin-ski", name: "Arapahoe Basin Ski Area", location: "Dillon",
    description: "Boasts one of the longest ski seasons in North America (often into June or July) and challenging high-alpine terrain. Known for its steep chutes, open bowls, and the famous Pallavicini run. Features 1,428 acres of skiable terrain, 9 lifts, and a vertical drop of 2,270 feet. Offers a unique 'beach' tailgating scene at the base.",
    image: "", latitude: 39.6400, longitude: -105.8700,
  },
  {
    category: "Ski Resorts", id: "breckenridge-ski", name: "Breckenridge Ski Resort", location: "Breckenridge",
    description: "A large, popular resort with diverse terrain spread across five peaks, catering to all skill levels. Known for its high-alpine bowls, extensive groomed runs, and a vibrant historic mining town at its base. Features nearly 3,000 acres of skiable terrain, 35 lifts, and a vertical drop of 3,398 feet. Offers high-speed lifts and a lively après-ski scene.",
    image: "", latitude: 39.4800, longitude: -105.9000,
  },
  {
    category: "Ski Resorts", id: "vail-ski", name: "Vail Ski Resort", location: "Vail",
    description: "One of North America's largest and most famous ski resorts, renowned for its vast Back Bowls and luxurious European-style village. Offers extensive terrain for all abilities, from gentle cruisers to challenging moguls and glades. Features over 5,300 acres of skiable terrain, 31 lifts, and a vertical drop of 3,450 feet. Known for its consistent snowfall and world-class amenities.",
    image: "", latitude: 39.6400, longitude: -106.3700,
  },
  {
    category: "Ski Resorts", id: "winter-park-resort", name: "Winter Park Resort", location: "Winter Park",
    description: "Colorado's longest continually operated ski resort, offering diverse terrain spread across seven territories, including the challenging moguls and glades of Mary Jane. Known for its family-friendly atmosphere and accessible location via the Winter Park Express train from Denver. Features over 3,000 acres of skiable terrain, 25 lifts, and a vertical drop = 3,060 feet. Offers a variety of winter activities beyond skiing.",
    image: "", latitude: 39.8900, longitude: -105.7600,
  },
  {
    category: "Ski Resorts", id: "steamboat-resort", name: "Steamboat Resort", location: "Steamboat Springs",
    description: "Known for its unique 'Champagne Powder' snow and legendary tree skiing, Steamboat offers a distinct western heritage and a welcoming atmosphere. The resort features diverse terrain across six peaks, from wide-open cruisers to challenging steeps and glades. Features nearly 3,000 acres of skiable terrain, 18 lifts, and a vertical drop of 3,668 feet. Offers natural hot springs nearby.",
    image: "", latitude: 40.4500, longitude: -106.8000,
  },
  {
    category: "Ski Resorts", id: "aspen-snowmass", name: "Aspen Snowmass", location: "Aspen",
    description: "Comprising four distinct mountains (Snowmass, Aspen Mountain, Aspen Highlands, Buttermilk), Aspen Snowmass offers world-class skiing and a vibrant cultural scene. Each mountain caters to different abilities, from beginner-friendly Buttermilk to expert-only Highlands. Features over 5,500 acres of combined skiable terrain and numerous lifts. Known for its luxury amenities, high-end dining, and diverse winter events.",
    image: "", latitude: 39.2000, longitude: -106.9500,
  },
];

// Map initial data to include distanceFromBoulder
const allBucketListData = initialBucketListData.map(item => ({
  ...item,
  distanceFromBoulder: haversineDistance(BOULDER_LAT, BOULDER_LON, item.latitude, item.longitude)
}));


// Main App Component
const App = () => {
  const [activities, setActivities] = useState([]); // Now holds all activities
  const [completedActivities, setCompletedActivities] = useState({}); // Stores activityId -> true/false
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // New state for selected category
  const [selectedCategory, setSelectedCategory] = useState('Hikes'); // Default to Hikes

  // State for selected filter options (checkboxes)
  const [selectedFilters, setSelectedFilters] = useState({
    difficulty: [],
    distance: [],
    length: [], // Only relevant for Hikes
    streamType: [], // New filter for Fly Fishing
  });

  const [selectedActivity, setSelectedActivity] = useState(null); // Now selected activity
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [activityToConfirm, setActivityToConfirm] = useState(null); // Now activity to confirm
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const markersRef = useRef([]);

  // Firestore references
  const activitiesCollectionRef = useRef(null); // Generic for all activities
  const userCompletedActivitiesCollectionRef = useRef(null);

  // Filter options for the new modal - dynamically generated based on category
  const getDifficultyOptions = () => {
    // Difficulty options apply to Hikes and National Parks
    // Fly Fishing and Ski Resorts don't use a difficulty filter
    return ['Easy', 'Moderate', 'Difficult', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
  };

  const distanceOptions = [
    { label: '0-25 miles', min: 0, max: 25 },
    { label: '25-50 miles', min: 25, max: 50 },
    { label: '50-100 miles', min: 50, max: 100 },
    { label: '100+ miles', min: 100, max: Infinity },
  ];

  const getLengthOptions = (category) => {
    if (category === 'Hikes') {
      return [
        { label: 'Short (< 5 miles)', min: 0, max: 5 },
        { label: 'Medium (5-10 miles)', min: 5, max: 10 },
        { label: 'Long (> 10 miles)', min: 10, max: Infinity },
      ];
    }
    return []; // Length filter not applicable for other categories
  };

  // Helper to parse length string (e.g., "3.2 miles (round trip)" to 3.2)
  const parseLength = (lengthStr) => {
    if (!lengthStr) return 0;
    const match = lengthStr.match(/(\d+(\.\d+)?)\s*miles/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Filtered activities based on search term, category, and checkbox filters
  const filteredActivities = activities.filter(activity => {
    // Filter by selected category first
    if (activity.category !== selectedCategory) {
      return false;
    }

    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          activity.location.toLowerCase().includes(searchTerm.toLowerCase());
    const isCompleted = completedActivities[activity.id];

    // Apply difficulty filter only if not Fly Fishing or Ski Resorts
    let matchesDifficulty = true;
    if (selectedCategory !== 'Fly Fishing' && selectedCategory !== 'Ski Resorts') {
        matchesDifficulty = selectedFilters.difficulty.length === 0 ||
                            selectedFilters.difficulty.includes(activity.difficulty);
    }

    // Apply stream type filter only if Fly Fishing
    let matchesStreamType = true;
    if (selectedCategory === 'Fly Fishing') {
        matchesStreamType = selectedFilters.streamType.length === 0 ||
                            selectedFilters.streamType.includes(activity.streamType);
    }

    // Apply distance filter
    const activityDistance = parseFloat(activity.distanceFromBoulder);
    const matchesDistance = selectedFilters.distance.length === 0 ||
                            selectedFilters.distance.some(rangeLabel => {
                              const range = distanceOptions.find(opt => opt.label === rangeLabel);
                              return activityDistance >= range.min && activityDistance < range.max;
                            });

    // Apply length filter (only for Hikes)
    let matchesLength = true;
    if (selectedCategory === 'Hikes') {
      const activityLength = parseLength(activity.length);
      matchesLength = selectedFilters.length.length === 0 ||
                      selectedFilters.length.some(rangeLabel => {
                        const range = getLengthOptions('Hikes').find(opt => opt.label === rangeLabel);
                        return activityLength >= range.min && activityLength < range.max;
                      });
    }

    if (showCompletedOnly) {
      return matchesSearch && matchesDifficulty && matchesStreamType && matchesDistance && matchesLength && isCompleted;
    } else {
      return matchesSearch && matchesDifficulty && matchesStreamType && matchesDistance && matchesLength;
    }
  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically


  // Function to load Google Maps API script
  const loadGoogleMapsScript = useCallback(() => {
    if (window.google && window.google.maps) {
      return Promise.resolve(); // Already loaded
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=&callback=initMap`; // No API key needed for canvas
      script.async = true;
      script.defer = true;
      window.initMap = () => resolve(); // Global callback for script loading
      script.onerror = (e) => {
        console.error("Failed to load Google Maps API script:", e);
        console.warn("Google Maps API Error: Ensure you have a valid API key and the Maps JavaScript API is enabled for your project in Google Cloud Console.");
        reject(e);
      };
      document.head.appendChild(script);
    });
  }, []);

  // Effect for Firebase initialization and authentication
  useEffect(() => {
    if (!app || !db || !auth) {
      console.error("Firebase is not initialized.");
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("Authenticated with UID:", user.uid);
      } else {
        // Sign in anonymously if no custom token is provided or user is not authenticated
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            setUserId(auth.currentUser.uid);
            console.log("Signed in with custom token.");
          } else {
            const anonUser = await signInAnonymously(auth);
            setUserId(anonUser.user.uid);
            console.log("Signed in anonymously.");
          }
        } catch (error) {
          console.error("Firebase authentication failed:", error);
          setUserId(crypto.randomUUID()); // Fallback to a random ID if auth fails
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []); // Run only once on component mount

  // Effect for fetching all activities and completed activities
  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      return;
    }

    setLoading(true);

    // Set up Firestore collection references
    activitiesCollectionRef.current = collection(db, `artifacts/${appId}/public/data/bucketListActivities`);
    userCompletedActivitiesCollectionRef.current = collection(db, `artifacts/${appId}/users/${userId}/completedActivities`);

    // Listen for real-time updates to all activities
    const unsubscribeActivities = onSnapshot(activitiesCollectionRef.current, async (snapshot) => {
      const fetchedActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(fetchedActivities);

      // If no activities exist in Firestore, add the initial sample data
      if (fetchedActivities.length === 0) {
        console.log("No activities found in Firestore. Populating with sample data...");
        for (const activity of allBucketListData) {
          // Use setDoc to ensure the ID is preserved and avoid duplicates if run multiple times
          await setDoc(doc(activitiesCollectionRef.current, activity.id), activity);
        }
        console.log("Sample activities added to Firestore.");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activities:", error);
      setLoading(false);
    });

    // Listen for real-time updates to completed activities for the current user
    const unsubscribeCompletedActivities = onSnapshot(userCompletedActivitiesCollectionRef.current, (snapshot) => {
      const fetchedCompletedActivities = {};
      snapshot.docs.forEach(doc => {
        fetchedCompletedActivities[doc.id] = doc.data().completed;
      });
      setCompletedActivities(fetchedCompletedActivities);
    }, (error) => {
      console.error("Error fetching completed activities:", error);
    });

    return () => {
      unsubscribeActivities();
      unsubscribeCompletedActivities();
    };
  }, [isAuthReady, userId]); // Re-run when auth state is ready or userId changes

  // Effect for Google Map initialization and marker updates
  useEffect(() => {
    if (showMap && !loading && mapRef.current && window.google && window.google.maps) {
      // Initialize map if it doesn't exist
      if (!googleMapInstance.current) {
        googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: BOULDER_LAT, lng: BOULDER_LON }, // Center map on Boulder
          zoom: 8,
          mapTypeControl: false, // Hide map type control
          streetViewControl: false, // Hide street view control
          fullscreenControl: false, // Hide fullscreen control
          zoomControl: true, // Show zoom control
        });
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers for filtered activities
      filteredActivities.forEach(activity => {
        if (activity.latitude && activity.longitude) {
          const marker = new window.google.maps.Marker({
            position: { lat: activity.latitude, lng: activity.longitude },
            map: googleMapInstance.current,
            title: activity.name,
          });

          // Add info window for each marker
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="font-family: 'Inter', sans-serif; padding: 5px;">
                <h4 style="font-weight: bold; margin-bottom: 5px;">${activity.name}</h4>
                <p><strong>Location:</strong> ${activity.location}</p>
                <p><strong>Category:</strong> ${activity.category}</p>
                ${activity.difficulty && activity.category !== 'Fly Fishing' && activity.category !== 'Ski Resorts' ? `<p><strong>Difficulty:</strong> ${activity.difficulty}</p>` : ''}
                ${activity.streamType ? `<p><strong>Stream Type:</strong> ${activity.streamType}</p>` : ''}
                ${activity.length ? `<p><strong>Length:</strong> ${activity.length}</p>` : ''}
                <p><strong>Distance from Boulder:</strong> ${activity.distanceFromBoulder} miles</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(googleMapInstance.current, marker);
            setSelectedActivity(activity); // Also open the detail modal when clicking marker
          });
          markersRef.current.push(marker);
        }
      });
    } else if (showMap && !window.google?.maps) {
      // If map is selected but Google Maps API isn't loaded, load it
      loadGoogleMapsScript().then(() => {
        console.log("Google Maps API loaded.");
      }).catch(error => {
        console.error("Failed to load Google Maps API:", error);
      });
    }
  }, [showMap, loading, filteredActivities, loadGoogleMapsScript]); // Re-run when map visibility, loading, or filtered activities change

  // Function to handle marking an activity as completed/uncompleted
  const handleToggleCompleted = async (activityId, isCompleted) => {
    if (!userId) {
      console.error("User not authenticated.");
      return;
    }

    try {
      const completedActivityDocRef = doc(userCompletedActivitiesCollectionRef.current, activityId);
      if (isCompleted) {
        await setDoc(completedActivityDocRef, { completed: true });
        console.log(`Activity ${activityId} marked as completed.`);
      } else {
        await deleteDoc(completedActivityDocRef);
        console.log(`Activity ${activityId} marked as uncompleted.`);
      }
      // UI will update automatically via onSnapshot listener
    } catch (error) {
      console.error("Error toggling completed status:", error);
    }
    setShowConfirmationModal(false); // Close modal after action
    setActivityToConfirm(null);
    setConfirmationAction(null);
  };

  // Handle checkbox change in filter modal
  const handleFilterChange = (category, value) => {
    setSelectedFilters(prevFilters => {
      const currentCategoryFilters = prevFilters[category];
      if (currentCategoryFilters.includes(value)) {
        return {
          ...prevFilters,
          [category]: currentCategoryFilters.filter(item => item !== value)
        };
      } else {
        return {
          ...prevFilters,
          [category]: [...currentCategoryFilters, value]
        };
      }
    });
  };

  // Confirmation Modal Component
  const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <div className="flex justify-around">
          <button
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Filter Modal Component
  const FilterModal = ({ show, onClose, selected, onFilterChange, currentCategory, onApply }) => {
    if (!show) return null;

    const currentDifficultyOptions = getDifficultyOptions();
    const currentLengthOptions = getLengthOptions(currentCategory);

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full overflow-y-auto max-h-[90vh] animate-scale-in">
          <h3 className="text-2xl font-bold text-green-800 mb-4 border-b pb-2">Filter {currentCategory}</h3>

          {/* Difficulty Filter (conditionally rendered) */}
          {currentCategory !== 'Fly Fishing' && currentCategory !== 'Ski Resorts' && (
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-700 mb-3">Difficulty</h4>
              <div className="grid grid-cols-2 gap-3">
                {currentDifficultyOptions.map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition duration-200">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
                      checked={selected.difficulty.includes(option)}
                      onChange={() => onFilterChange('difficulty', option)}
                    />
                    <span className="text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Distance from Boulder Filter */}
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-gray-700 mb-3">Distance from Boulder</h4>
            <div className="grid grid-cols-2 gap-3">
              {distanceOptions.map(option => (
                <label key={option.label} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition duration-200">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={selected.distance.includes(option.label)}
                    onChange={() => onFilterChange('distance', option.label)}
                  />
                  <span className="text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Length Filter (conditionally rendered for Hikes) */}
          {currentCategory === 'Hikes' && currentLengthOptions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-700 mb-3">Length</h4>
              <div className="grid grid-cols-2 gap-3">
                {currentLengthOptions.map(option => (
                  <label key={option.label} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition duration-200">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                      checked={selected.length.includes(option.label)}
                      onChange={() => onFilterChange('length', option.label)}
                    />
                    <span className="text-gray-800">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Stream Type Filter (conditionally rendered for Fly Fishing) */}
          {currentCategory === 'Fly Fishing' && (
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-700 mb-3">Stream Type</h4>
              <div className="grid grid-cols-2 gap-3">
                {['Freestone', 'Tailwater', 'Spring Creek', 'Freestone/Tailwater'].map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition duration-200">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-teal-600 rounded focus:ring-teal-500"
                      checked={selected.streamType?.includes(option) || false} // Use optional chaining and default to false
                      onChange={() => onFilterChange('streamType', option)}
                    />
                    <span className="text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 font-inter text-gray-800">
      {/* Tailwind CSS CDN */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-white shadow-lg p-4 sticky top-0 z-40">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-green-700 mb-2 sm:mb-0">CU Boulder Bucket List</h1>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span className="text-sm text-gray-600">User ID: {userId || 'Loading...'}</span>
            <button
              onClick={() => setShowCompletedOnly(!showCompletedOnly)}
              className={`py-2 px-4 rounded-full font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${
                showCompletedOnly ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showCompletedOnly ? 'Show All Activities' : 'Show Completed Activities'}
            </button>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`py-2 px-4 rounded-full font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${
                showMap ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showMap ? 'Show List View' : 'Show Map View'}
            </button>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="bg-gray-100 shadow-inner p-3">
        <div className="container mx-auto flex flex-wrap justify-center gap-3">
          {['Hikes', 'Fly Fishing', 'National Parks', 'Ski Resorts'].map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSearchTerm(''); // Clear search when changing category
                setSelectedFilters({ difficulty: [], distance: [], length: [], streamType: [] }); // Reset filters including new streamType
                setShowMap(false); // Reset to list view
              }}
              className={`py-2 px-5 rounded-full font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${
                selectedCategory === category
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 py-8">
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            <p className="ml-4 text-xl text-gray-600">Loading activities...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Search and Filter Button */}
            <div className="mb-8 p-4 bg-white rounded-xl shadow-md flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-4 w-full sm:w-auto flex-grow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={`Search ${selectedCategory.toLowerCase()} by name or location...`}
                  className="flex-grow p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className="py-2 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span>Filters</span>
              </button>
            </div>

            {/* Conditional Rendering for List View or Map View */}
            {showMap ? (
              <div ref={mapRef} className="w-full h-[600px] rounded-xl shadow-lg border border-gray-200">
                {/* Google Map will be rendered here */}
                {!window.google?.maps && (
                  <div className="flex justify-center items-center h-full bg-gray-100 text-gray-500">
                    Loading Map...
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map(activity => (
                    <div
                      key={activity.id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                    >
                      {activity.image && (
                        <img
                          src={activity.image}
                          alt={activity.name}
                          className="w-full h-48 object-cover object-center"
                          onError={(e) => { e.target.style.display = 'none'; }} // Hide image if it fails to load
                        />
                      )}
                      <div className="p-5 flex-grow flex flex-col">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{activity.name}</h2>
                        <p className="text-gray-600 mb-1"><strong>Location:</strong> {activity.location}</p>
                        {/* Conditionally render Category and Difficulty */}
                        {activity.category !== 'Fly Fishing' && activity.category !== 'Ski Resorts' && <p className="text-gray-600 mb-1"><strong>Category:</strong> {activity.category}</p>}
                        {activity.difficulty && activity.category !== 'Fly Fishing' && activity.category !== 'Ski Resorts' && <p className="text-gray-600 mb-1"><strong>Difficulty:</strong> <span className={`font-semibold ${
                          activity.difficulty.includes('Easy') || activity.difficulty.includes('Beginner') ? 'text-green-600' :
                          activity.difficulty.includes('Moderate') || activity.difficulty.includes('Intermediate') ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{activity.difficulty}</span></p>}
                        {activity.streamType && <p className="text-gray-600 mb-1"><strong>Stream Type:</strong> {activity.streamType}</p>}
                        {activity.length && <p className="text-gray-600 mb-1"><strong>Length:</strong> {activity.length}</p>}
                        {activity.elevationGain && <p className="text-gray-600 mb-1"><strong>Elevation Gain:</strong> {activity.elevationGain}</p>}
                        <p className="text-gray-600 mb-4"><strong>Distance from Boulder:</strong> {activity.distanceFromBoulder} miles</p>

                        <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening detail modal
                              setSelectedActivity(activity);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold transition duration-300 ease-in-out"
                          >
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening detail modal
                              setActivityToConfirm(activity);
                              setConfirmationAction(completedActivities[activity.id] ? 'uncomplete' : 'complete');
                              setShowConfirmationModal(true);
                            }}
                            className={`py-2 px-4 rounded-full text-white font-bold shadow-md transition duration-300 ease-in-out transform hover:scale-105 ${
                              completedActivities[activity.id] ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {completedActivities[activity.id] ? 'Mark Uncompleted' : 'Mark Completed'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-xl text-gray-600 py-10">
                    {showCompletedOnly ? "No completed activities found." : `No ${selectedCategory.toLowerCase()} match your search or filter criteria.`}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all duration-300 scale-95 opacity-0 animate-scale-in">
            <div className="relative">
              {selectedActivity.image && (
                <img
                  src={selectedActivity.image}
                  alt={selectedActivity.name}
                  className="w-full h-64 object-cover object-center"
                  onError={(e) => { e.target.style.display = 'none'; }} // Hide image if it fails to load
                />
              )}
              <button
                onClick={() => setSelectedActivity(null)}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-3xl font-bold text-green-800 mb-3">{selectedActivity.name}</h3>
              <p className="text-gray-700 mb-2"><strong>Location:</strong> {selectedActivity.location}</p>
              {/* Conditionally render Category and Difficulty in detail modal */}
              {selectedActivity.category !== 'Fly Fishing' && selectedActivity.category !== 'Ski Resorts' && <p className="text-gray-700 mb-2"><strong>Category:</strong> {selectedActivity.category}</p>}
              {selectedActivity.difficulty && selectedActivity.category !== 'Fly Fishing' && selectedActivity.category !== 'Ski Resorts' && <p className="text-gray-700 mb-2"><strong>Difficulty:</strong> <span className={`font-semibold ${
                selectedActivity.difficulty.includes('Easy') || selectedActivity.difficulty.includes('Beginner') ? 'text-green-600' :
                selectedActivity.difficulty.includes('Moderate') || selectedActivity.difficulty.includes('Intermediate') ? 'text-yellow-600' :
                'text-red-600'
              }`}>{selectedActivity.difficulty}</span></p>}
              {selectedActivity.streamType && <p className="text-gray-700 mb-2"><strong>Stream Type:</strong> {selectedActivity.streamType}</p>}
              {selectedActivity.length && <p className="text-gray-700 mb-2"><strong>Length:</strong> {selectedActivity.length}</p>}
              {selectedActivity.elevationGain && <p className="text-gray-700 mb-4"><strong>Elevation Gain:</strong> {selectedActivity.elevationGain}</p>}
              <p className="text-gray-700 mb-4"><strong>Distance from Boulder:</strong> {selectedActivity.distanceFromBoulder} miles</p>
              <p className="text-gray-800 leading-relaxed">{selectedActivity.description}</p>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setActivityToConfirm(selectedActivity);
                    setConfirmationAction(completedActivities[selectedActivity.id] ? 'uncomplete' : 'complete');
                    setShowConfirmationModal(true);
                  }}
                  className={`py-3 px-6 rounded-full text-white font-bold shadow-lg transition duration-300 ease-in-out transform hover:scale-105 ${
                    completedActivities[selectedActivity.id] ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {completedActivities[selectedActivity.id] ? 'Mark Uncompleted' : 'Mark Completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && activityToConfirm && (
        <ConfirmationModal
          message={`Are you sure you want to mark "${activityToConfirm.name}" as ${confirmationAction === 'complete' ? 'completed' : 'uncompleted'}?`}
          onConfirm={() => handleToggleCompleted(activityToConfirm.id, confirmationAction === 'complete')}
          onCancel={() => {
            setShowConfirmationModal(false);
            setActivityToConfirm(null);
            setConfirmationAction(null);
          }}
        />
      )}

      {/* Main Filter Modal */}
      <FilterModal
        show={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selected={selectedFilters}
        onFilterChange={handleFilterChange}
        currentCategory={selectedCategory} // Pass current category to filter modal
        onApply={() => setShowFilterModal(false)} // Simply close the modal, filtering logic is reactive
      />

      {/* Custom styles for Inter font and animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default App;