// frontend/src/pages/Map/VillageMapPage.jsx
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayerGroup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { villagesAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored icons
const createIcon = (color, emoji) => L.divIcon({
  className: '',
  html: `<div style="
    width:32px; height:32px; border-radius:50% 50% 50% 0;
    background:${color}; transform:rotate(-45deg);
    border:2px solid rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const HH_ICONS = {
  installed: createIcon('#40C584', '🏠'),
  applied:   createIcon('#F5A623', '🏠'),
  not_applied: createIcon('#EF4444', '🏠'),
};

const FM_ICONS = {
  installed: createIcon('#38BDF8', '💧'),
  applied:   createIcon('#A78BFA', '💧'),
  default:   createIcon('#94A3B8', '💧'),
};

let globalMountCount = 0;

export default function VillageMapPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState({ households: true, farmers: true, land: true });
  const [search, setSearch] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mountId] = useState(() => ++globalMountCount);
  const containerRef = useRef(null);

  useEffect(() => {
    setMapReady(true);
    return () => setMapReady(false);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.querySelectorAll('*');
      children.forEach(node => {
        if (node._leaflet_id) {
          node._leaflet_id = null;
        }
      });
    }
  }, [mapReady]);

  useEffect(() => {
    if (!user?.village_id) return;
    let active = true;
    villagesAPI.mapData(user.village_id)
      .then(r => {
        if (active) setMapData(r.data);
      })
      .catch(() => {
        if (active) toast.error('Failed to load map data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.village_id]);

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (!mapData) return <div className="empty-state"><div className="empty-state-title">Map data unavailable</div></div>;

  const { village, households, farmers, land_parcels } = mapData;
  const center = [village?.latitude || 18.758, village?.longitude || 79.496];

  const filteredHH = search ? households.filter(h => h.head_name?.toLowerCase().includes(search.toLowerCase()) || h.house_no?.toLowerCase().includes(search.toLowerCase())) : households;
  const filteredFM = search ? farmers.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()) || f.survey_number?.includes(search)) : farmers;

  const stats = {
    hh_total: households.length,
    hh_installed: households.filter(h => h.solar_status === 'installed').length,
    hh_applied: households.filter(h => h.solar_status === 'applied').length,
    fm_total: farmers.length,
    fm_installed: farmers.filter(f => f.pump_status === 'installed').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-heading">🗺️ Village Solar Map</div>
          <div className="page-subheading">{village?.name} • All solar assets on satellite view</div>
        </div>
        <div className="page-header-actions">
          <div className="search-box" style={{ minWidth: 220 }}>
            <span>🔍</span>
            <input placeholder="Search household or farmer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Houses on Map', val: stats.hh_total, color: 'var(--text-primary)' },
          { label: '🟢 Solar Installed', val: stats.hh_installed, color: '#40C584' },
          { label: '🟡 Solar Applied', val: stats.hh_applied, color: '#F5A623' },
          { label: '💧 Pumps Installed', val: stats.fm_installed, color: '#38BDF8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {/* Map */}
        <div style={{ flex: 1 }}>
          <div ref={containerRef} className="map-container" style={{ height: 550 }}>
            {mapReady && (
              <MapContainer key={`${village?.id || 'map'}-${mountId}`} center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
              />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
                opacity={0.3}
              />

              {/* Households layer */}
              {activeLayer.households && filteredHH.filter(h => h.latitude && h.longitude).map(h => (
                <Marker key={`hh-${h.id}`} position={[h.latitude, h.longitude]}
                  icon={HH_ICONS[h.solar_status] || HH_ICONS.not_applied}>
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: '#F5A623', marginBottom: 6 }}>🏠 {h.head_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{h.household_id}</div>
                      <div style={{ fontSize: '0.8rem' }}>Ward {h.ward_no} / House {h.house_no}</div>
                      <div style={{ fontSize: '0.8rem' }}>Roof: {h.roof_area} sqft</div>
                      <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 600, color: h.solar_status === 'installed' ? '#40C584' : h.solar_status === 'applied' ? '#F5A623' : '#EF4444' }}>
                        {h.solar_status?.replace('_', ' ').toUpperCase()}
                      </div>
                      <button
                        onClick={() => navigate(`/households/${h.id}`)}
                        style={{ marginTop: 8, background: '#F5A623', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Farmers layer */}
              {activeLayer.farmers && filteredFM.filter(f => f.latitude && f.longitude).map(f => (
                <Marker key={`fm-${f.id}`} position={[f.latitude, f.longitude]}
                  icon={f.pump_status === 'installed' ? FM_ICONS.installed : f.pump_status === 'applied' ? FM_ICONS.applied : FM_ICONS.default}>
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: '#38BDF8', marginBottom: 6 }}>💧 {f.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{f.farmer_id}</div>
                      <div style={{ fontSize: '0.8rem' }}>Survey: {f.survey_number}</div>
                      <div style={{ fontSize: '0.8rem' }}>Land: {f.land_extent} acres</div>
                      <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 600, color: f.pump_status === 'installed' ? '#40C584' : f.pump_status === 'applied' ? '#A78BFA' : '#94A3B8' }}>
                        {f.pump_status?.replace('_', ' ').toUpperCase()}
                      </div>
                      <button
                        onClick={() => navigate(`/farmers/${f.id}`)}
                        style={{ marginTop: 8, background: '#38BDF8', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Land parcels */}
              {activeLayer.land && land_parcels.filter(lp => lp.geojson_polygon).map(lp => {
                try {
                  const geojson = typeof lp.geojson_polygon === 'string' ? JSON.parse(lp.geojson_polygon) : lp.geojson_polygon;
                  const coords = geojson.coordinates[0].map(c => [c[1], c[0]]);
                  return (
                    <Polygon key={`lp-${lp.id}`} positions={coords}
                      pathOptions={{ color: lp.status === 'installed' ? '#40C584' : '#A78BFA', fillOpacity: 0.2, weight: 2 }}>
                      <Popup>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>⚡ Land Parcel</div>
                        <div style={{ fontSize: '0.8rem' }}>Survey: {lp.survey_number}</div>
                        <div style={{ fontSize: '0.8rem' }}>Area: {lp.extent_acres} acres</div>
                        <div style={{ fontSize: '0.8rem' }}>Status: {lp.status}</div>
                        {lp.plant_capacity_mw && <div style={{ fontSize: '0.8rem' }}>Target: {lp.plant_capacity_mw} MW</div>}
                      </Popup>
                    </Polygon>
                  );
                } catch { return null; }
              })}
            </MapContainer>
            )}
          </div>
        </div>

        {/* Legend Panel */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="card-title" style={{ marginBottom: 'var(--space-3)', fontSize: '0.85rem' }}>🗂️ Layers</div>
            {[
              { key: 'households', label: 'Households', icon: '🏠' },
              { key: 'farmers', label: 'Farmers', icon: '💧' },
              { key: 'land', label: 'Land Parcels', icon: '⚡' },
            ].map(l => (
              <label key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer', marginBottom: 8 }}>
                <input type="checkbox" checked={activeLayer[l.key]} onChange={e => setActiveLayer(al => ({ ...al, [l.key]: e.target.checked }))} />
                {l.icon} {l.label}
              </label>
            ))}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-3)', fontSize: '0.85rem' }}>🎨 Legend</div>
            <div className="map-legend" style={{ border: 'none', padding: 0 }}>
              {[
                { color: '#40C584', label: 'Solar Installed', icon: '🏠' },
                { color: '#F5A623', label: 'Solar Applied', icon: '🏠' },
                { color: '#EF4444', label: 'Not Applied', icon: '🏠' },
                { color: '#38BDF8', label: 'Pump Installed', icon: '💧' },
                { color: '#A78BFA', label: 'Pump Applied', icon: '💧' },
                { color: '#94A3B8', label: 'No Pump', icon: '💧' },
                { color: '#A78BFA', label: 'Land Identified', icon: '⬛' },
                { color: '#40C584', label: 'Plant Installed', icon: '⬛' },
              ].map(l => (
                <div key={l.label} className="legend-item">
                  <div className="legend-dot" style={{ background: l.color }} />
                  <span style={{ fontSize: '0.72rem' }}>{l.icon} {l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
