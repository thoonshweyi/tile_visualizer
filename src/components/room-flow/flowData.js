import diningRoom from '../../assets/img/rooms/samplediningroom2.png'
import diningRoomWide from '../../assets/img/rooms/samplediningroom.png'
import livingRoom from '../../assets/img/rooms/simplelivingroom.jpg'
import livingRoomSoft from '../../assets/img/rooms/simplelivingroom2.png'
import bedroom from '../../assets/img/rooms/simplebedroom.jpg'
import kitchen from '../../assets/img/rooms/simplekitchen.jpg'
import tile01 from '../../assets/img/tiles/2000000600727 Tile.jpg'
import tile02 from '../../assets/img/tiles/2000000591766 Tile.jpg'
import tile03 from '../../assets/img/tiles/2000000503004 Tile.jpg'
import tile04 from '../../assets/img/tiles/2000000432168 Tile.jpg'
import tile05 from '../../assets/img/tiles/2000000443478 Tile.jpg'
import tile06 from '../../assets/img/tiles/2000000602547 Tile.jpg'

export const ROOMS = [
  { id: 'living-sun', name: 'Sunlit living room', category: 'Living', src: livingRoom },
  { id: 'living-soft', name: 'Soft living room', category: 'Living', src: livingRoomSoft },
  { id: 'bedroom-calm', name: 'Calm bedroom', category: 'Bedroom', src: bedroom },
  { id: 'kitchen-modern', name: 'Modern kitchen', category: 'Kitchen', src: kitchen },
  { id: 'dining-warm', name: 'Warm dining room', category: 'Dining', src: diningRoom },
  { id: 'dining-airy', name: 'Airy dining room', category: 'Dining', src: diningRoomWide },
]

export const PRODUCTS = [
  { id: 'ivory', name: 'Ivory Vein', sku: '600727', size: '600 × 1200 mm', src: tile01, badge: 'New' },
  { id: 'cloud', name: 'Cloud Marble', sku: '591766', size: '600 × 1200 mm', src: tile02, badge: 'Popular' },
  { id: 'sand', name: 'Warm Sand', sku: '503004', size: '600 × 600 mm', src: tile03 },
  { id: 'terrazzo', name: 'Soft Terrazzo', sku: '432168', size: '600 × 600 mm', src: tile04 },
  { id: 'travertine', name: 'Travertine', sku: '443478', size: '600 × 1200 mm', src: tile05, badge: 'Popular' },
  { id: 'pearl', name: 'Pearl Stone', sku: '602547', size: '600 × 600 mm', src: tile06 },
]
