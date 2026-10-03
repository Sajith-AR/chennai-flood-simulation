"""
Script to build high-fidelity offline Chennai Road Network Graph.
Includes major corridors:
- Anna Salai
- Poonamallee High Road
- GST Road
- OMR (Rajiv Gandhi Salai)
- ECR (East Coast Road)
- Inner Ring Road (100 Feet Road)
- 200 Feet Radial Road
- Sardar Patel Road
- Arcot Road
- Chennai Bypass & Outer Ring Links
- North Chennai Corridors (CTH Road, Rajaji Salai, Kamarajar Salai)
- River Bridges (Adyar River, Cooum River, Buckingham Canal)
"""
import json
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 4)

# Key Nodes across Chennai
# (id, name, lat, lon, elevation_m, is_bridge, is_elevated)
nodes_raw = [
    # North Chennai & Port
    ("N_PORT", "Chennai Port Gate", 13.0838, 80.2932, 3.5, False, False),
    ("N_CENTRAL", "Chennai Central Junction", 13.0827, 80.2764, 4.0, False, False),
    ("N_PARK_TOWN", "Park Town Junction", 13.0847, 80.2778, 4.2, False, False),
    ("N_EGMORE", "Egmore Railway Station Junction", 13.0780, 80.2600, 5.0, False, False),
    ("N_ETHIRAJ", "Ethiraj Salai Junction", 13.0673, 80.2581, 6.0, False, False),
    ("N_MARINA_N", "Napier Bridge / Marina North", 13.0694, 80.2865, 3.0, True, False),
    ("N_MARINA_MID", "Queen Mary's / Marina Beach Road", 13.0450, 80.2810, 4.0, False, False),
    ("N_MYLAPORE", "Luz Church / Mylapore Junction", 13.0334, 80.2675, 6.0, False, False),
    ("N_SANTHOME", "Santhome High Road Junction", 13.0315, 80.2780, 4.5, False, False),
    ("N_PERAMBUR", "Perambur Railway Stadium Junction", 13.1075, 80.2435, 5.5, False, False),
    ("N_KOLATHUR", "Kolathur Retteri Junction", 13.1235, 80.2195, 6.0, False, False),
    ("N_MADHAVARAM", "Madhavaram Roundabout", 13.1480, 80.2310, 7.0, False, False),
    ("N_AMBATTUR", "Ambattur Industrial Estate Junction", 13.0978, 80.1617, 12.0, False, False),
    ("N_KORATTUR", "Korattur CTH Road", 13.1050, 80.1850, 9.0, False, False),
    ("N_VILLIVAKKAM", "Villivakkam Junction", 13.1050, 80.2100, 7.5, False, False),

    # Poonamallee High Road & West Corridors
    ("N_CHETPET", "Chetpet Eco Park / Pachaiyappa's", 13.0768, 80.2325, 6.5, False, False),
    ("N_KILPAUK", "Kilpauk Medical College Junction", 13.0800, 80.2450, 7.0, False, False),
    ("N_AMINJIKARAI", "Aminjikarai Cooum Bridge", 13.0740, 80.2220, 5.0, True, False),
    ("N_SHENOY_NGR", "Shenoy Nagar Junction", 13.0760, 80.2250, 6.5, False, False),
    ("N_ARUMBAKKAM", "Arumbakkam DG Vaishnav Junction", 13.0720, 80.2120, 7.0, False, False),
    ("N_KOYAMBEDU", "Koyambedu Wholesale Terminal", 13.0694, 80.1914, 8.0, False, False),
    ("N_KOYAMBEDU_FLY", "Koyambedu Elevated Flyover", 13.0710, 80.1960, 14.0, False, True),
    ("N_MADURAVOYAL", "Maduravoyal Grade Separator", 13.0650, 80.1600, 11.0, False, True),
    ("N_POONAMALLEE", "Poonamallee Bus Terminus", 13.0480, 80.1080, 15.0, False, False),

    # Central & Anna Salai Corridors
    ("N_THOUSAND_LIGHTS", "Thousand Lights / Anna Salai", 13.0580, 80.2520, 7.5, False, False),
    ("N_TEYNAMPET", "Teynampet Signal / Anna Salai", 13.0420, 80.2460, 8.0, False, False),
    ("N_NANDANAM", "Nandanam YMCA Junction", 13.0270, 80.2380, 6.5, False, False),
    ("N_KOTTURPURAM_BR", "Kotturpuram Adyar River Bridge", 13.0220, 80.2410, 3.5, True, False),
    ("N_SAIDAPET_METRO", "Saidapet Metro / Anna Salai", 13.0240, 80.2280, 5.5, False, False),
    ("N_SAIDAPET_BR", "Maraimalai Adigal Bridge (Saidapet)", 13.0213, 80.2231, 3.2, True, False),
    ("N_LITTLE_MOUNT", "Little Mount / Maraimalai Adigal Bridge South", 13.0180, 80.2240, 5.0, False, False),
    ("N_GUINDY_RACE", "Guindy Race Course / Anna Univ North", 13.0125, 80.2355, 7.5, False, False),
    ("N_KATHIPARA", "Kathipara Elevated Cloverleaf", 13.0070, 80.2050, 12.0, False, True),

    # T. Nagar & Kodambakkam
    ("N_TNAGAR_PANAGAL", "Panagal Park / T. Nagar", 13.0418, 80.2341, 6.0, False, False),
    ("N_TNAGAR_MADLEY", "Madley Subway / T. Nagar South", 13.0360, 80.2320, 4.0, False, False),
    ("N_TNAGAR_USMAN", "Usman Road Flyover", 13.0390, 80.2330, 9.0, False, True),
    ("N_LOYOLA", "Loyola College / Nungambakkam", 13.0645, 80.2338, 7.0, False, False),
    ("N_KODAMBAKKAM_BR", "Kodambakkam Railway Overbridge", 13.0510, 80.2270, 9.0, True, True),
    ("N_VADAPALANI", "Vadapalani Murugan Temple Signal", 13.0500, 80.2120, 8.5, False, False),
    ("N_ASHOK_PILLAR", "Ashok Pillar / 100 Feet Road", 13.0350, 80.2110, 7.5, False, False),
    ("N_JAFFERKHANPET_BR", "Jafferkhanpet Adyar River Bridge", 13.0305, 80.2078, 3.8, True, False),
    ("N_EKKATTUTHANGAL", "Ekkattuthangal Industrial Estate", 13.0220, 80.2050, 6.0, False, False),

    # South-West & Porur / Manapakkam / Trade Centre
    ("N_PORUR_JN", "Porur Roundabout / Mount-Poonamallee", 13.0350, 80.1580, 11.0, False, False),
    ("N_TRADE_CENTRE", "Chennai Trade Centre / Nandambakkam", 13.0175, 80.1834, 7.0, False, False),
    ("N_MANAPAKKAM_BR", "Manapakkam Adyar River Crossing", 13.0200, 80.1700, 4.0, True, False),
    ("N_RAMAPURAM", "Ramapuram MGR University", 13.0280, 80.1780, 8.0, False, False),

    # GST Road Corridor (South)
    ("N_AIRPORT", "Chennai International Airport Cargo Hub", 12.9866, 80.1650, 10.0, False, False),
    ("N_PALLAVARAM", "Pallavaram GST Junction", 12.9680, 80.1500, 12.0, False, False),
    ("N_CHROMEPET", "Chromepet Railway Station / GST", 12.9520, 80.1410, 14.0, False, False),
    ("N_TAMBARAM_SANAT", "Tambaram Sanatorium Grounds", 12.9420, 80.1380, 15.0, False, False),
    ("N_TAMBARAM_MEPZ", "Tambaram MEPZ Goods Depot", 12.9249, 80.1190, 17.0, False, False),
    ("N_TAMBARAM_MCC", "Madras Christian College (MCC)", 12.9213, 80.1233, 18.0, False, False),
    ("N_MUDICHUR_JN", "Tambaram West / Mudichur Road", 12.9100, 80.0800, 8.0, False, False),

    # Velachery & Pallikaranai Basin
    ("N_VELACHERY_VIJAYA", "Vijayanagar Bus Terminus / Velachery", 12.9796, 80.2185, 2.5, False, False),
    ("N_VELACHERY_GURU", "Guru Nanak College / Velachery North", 12.9904, 80.2198, 3.2, False, False),
    ("N_VELACHERY_MRTS", "Velachery MRTS Railway Station", 12.9780, 80.2150, 3.0, False, False),
    ("N_DHANDESWARAM", "Dhandeeswaram / Velachery West", 12.9720, 80.2120, 2.2, False, False),
    ("N_MADIPAKKAM", "Madipakkam Koot Road", 12.9647, 80.1961, 4.0, False, False),
    ("N_KOVILAMBAKKAM", "Kovilambakkam 200Ft Radial Road", 12.9480, 80.1900, 5.0, False, False),
    ("N_MEDAVAKKAM", "Medavakkam Junction", 12.9180, 80.1920, 8.0, False, False),
    ("N_PALLIKARANAI", "Pallikaranai Marsh Wetland Corridor", 12.9360, 80.2185, 1.8, False, False),

    # Adyar, Guindy & Coastal Corridors (OMR / ECR)
    ("N_MADHYA_KAILASH", "Madhya Kailash Temple / OMR Origin", 13.0070, 80.2460, 6.0, False, False),
    ("N_IIT_MADRAS", "IIT Madras Student Activity Centre", 12.9915, 80.2337, 8.0, False, False),
    ("N_ADYAR_DEPOT", "Adyar Cancer Institute / Bus Depot", 13.0067, 80.2450, 5.0, False, False),
    ("N_THIRU_VI_KA_BR", "Thiru Vi Ka Adyar River Bridge", 13.0110, 80.2570, 3.0, True, False),
    ("N_BESANT_NAGAR", "Besant Nagar Beach Corridor", 12.9990, 80.2680, 4.5, False, False),
    ("N_THIRUVANMIYUR_SIG", "Thiruvanmiyur Signal (OMR/ECR)", 12.9865, 80.2605, 5.5, False, False),
    ("N_TARAMANI_TIDEL", "Tidel Park / CSIR Road OMR", 12.9880, 80.2460, 6.5, False, False),
    ("N_PERUNGUDI", "Perungudi Tollgate / OMR", 12.9650, 80.2440, 5.0, False, False),
    ("N_THORAIPAKKAM", "Thoraipakkam 200Ft Road Junction", 12.9450, 80.2350, 4.0, False, False),
    ("N_SHOLINGANALLUR", "Sholinganallur Junction (OMR/Perumbakkam)", 12.9010, 80.2280, 5.5, False, False),
    ("N_KOTTIVAKKAM", "Kottivakkam ECR", 12.9730, 80.2620, 5.0, False, False),
    ("N_NEELANKARAI", "Neelankarai ECR", 12.9490, 80.2580, 4.5, False, False),
    ("N_INJAMBAKKAM", "Injambakkam ECR", 12.9230, 80.2520, 4.0, False, False),

    # Bypass Arterials
    ("N_CH_BYPASS_PORUR", "Chennai Bypass / Porur Toll", 13.0300, 80.1400, 14.0, False, True),
    ("N_CH_BYPASS_TAMBARAM", "Chennai Bypass / Tambaram Merge", 12.9300, 80.1100, 16.0, False, True),
]

nodes_dict = {
    n[0]: {
        "id": n[0],
        "name": n[1],
        "lat": n[2],
        "lon": n[3],
        "elevation_m": n[4],
        "is_bridge": n[5],
        "is_elevated": n[6]
    }
    for n in nodes_raw
}

# Define road connections (source_id, target_id, road_name, road_type, speed_kmh, bidirectional=True)
# road_types: 'motorway', 'trunk', 'primary', 'secondary', 'arterial'
connections = [
    # 1. Anna Salai (Central to Kathipara)
    ("N_CENTRAL", "N_EGMORE", "EVR Periyar Link", "primary", 45),
    ("N_CENTRAL", "N_PARK_TOWN", "Poonamallee High Rd Entry", "primary", 45),
    ("N_CENTRAL", "N_THOUSAND_LIGHTS", "Anna Salai (Mount Road)", "trunk", 55),
    ("N_THOUSAND_LIGHTS", "N_TEYNAMPET", "Anna Salai", "trunk", 55),
    ("N_TEYNAMPET", "N_NANDANAM", "Anna Salai", "trunk", 55),
    ("N_NANDANAM", "N_SAIDAPET_METRO", "Anna Salai", "trunk", 50),
    ("N_SAIDAPET_METRO", "N_SAIDAPET_BR", "Anna Salai Approach", "trunk", 45),
    ("N_SAIDAPET_BR", "N_LITTLE_MOUNT", "Maraimalai Adigal Bridge", "trunk", 40), # Critical bridge
    ("N_LITTLE_MOUNT", "N_GUINDY_RACE", "Anna Salai - Guindy", "trunk", 50),
    ("N_GUINDY_RACE", "N_KATHIPARA", "GST Road - Kathipara", "trunk", 60),

    # 2. Port & Marina Coastal Corridor
    ("N_PORT", "N_CENTRAL", "Rajaji Salai / Wall Tax Rd", "trunk", 50),
    ("N_PORT", "N_MARINA_N", "Kamarajar Salai North", "primary", 50),
    ("N_PARK_TOWN", "N_MARINA_N", "Swami Sivananda Salai", "primary", 45),
    ("N_MARINA_N", "N_MARINA_MID", "Kamarajar Salai (Marina Beach Rd)", "trunk", 55),
    ("N_MARINA_MID", "N_MYLAPORE", "Radhakrishnan Salai (RK Salai)", "primary", 45),
    ("N_MARINA_MID", "N_SANTHOME", "Santhome High Road", "primary", 45),
    ("N_SANTHOME", "N_THIRU_VI_KA_BR", "Santhome to Adyar Bridge", "primary", 45),
    ("N_THIRU_VI_KA_BR", "N_ADYAR_DEPOT", "Thiru Vi Ka Adyar Bridge", "primary", 40), # Adyar river bridge
    ("N_THIRU_VI_KA_BR", "N_BESANT_NAGAR", "Dr DGS Dinakaran Salai", "secondary", 35),
    ("N_BESANT_NAGAR", "N_THIRUVANMIYUR_SIG", "Besant Avenue Rd", "secondary", 35),

    # 3. North Chennai Corridors
    ("N_CENTRAL", "N_PERAMBUR", "Sydenhams Rd / Perambur Barracks", "primary", 40),
    ("N_PERAMBUR", "N_KOLATHUR", "Paper Mills Road", "primary", 40),
    ("N_KOLATHUR", "N_MADHAVARAM", "Inner Ring Rd North", "trunk", 55),
    ("N_MADHAVARAM", "N_AMBATTUR", "CTH Road / Puzhal Link", "trunk", 55),
    ("N_AMBATTUR", "N_KORATTUR", "CTH Road", "primary", 45),
    ("N_KORATTUR", "N_VILLIVAKKAM", "CTH Road", "primary", 45),
    ("N_VILLIVAKKAM", "N_KOLATHUR", "Villivakkam-Redhills Link", "secondary", 40),
    ("N_VILLIVAKKAM", "N_ARUMBAKKAM", "MTH Link to Inner Ring", "secondary", 40),

    # 4. Poonamallee High Road (Central to Poonamallee)
    ("N_PARK_TOWN", "N_CHETPET", "Poonamallee High Road", "trunk", 50),
    ("N_CHETPET", "N_KILPAUK", "Poonamallee High Road", "trunk", 50),
    ("N_KILPAUK", "N_AMINJIKARAI", "Poonamallee High Road", "trunk", 50),
    ("N_AMINJIKARAI", "N_SHENOY_NGR", "Aminjikarai Cooum Bridge", "trunk", 45), # Cooum bridge
    ("N_SHENOY_NGR", "N_ARUMBAKKAM", "Poonamallee High Road", "trunk", 50),
    ("N_ARUMBAKKAM", "N_KOYAMBEDU", "Poonamallee High Road", "trunk", 55),
    ("N_KOYAMBEDU", "N_KOYAMBEDU_FLY", "Koyambedu Grade Separator", "trunk", 60),
    ("N_KOYAMBEDU_FLY", "N_MADURAVOYAL", "Poonamallee High Rd Expressway", "motorway", 70),
    ("N_MADURAVOYAL", "N_POONAMALLEE", "NH 48 Bengaluru Hwy", "motorway", 70),

    # 5. Egmore / Nungambakkam / Central Cross Links
    ("N_EGMORE", "N_ETHIRAJ", "Ethiraj Salai", "secondary", 35),
    ("N_ETHIRAJ", "N_THOUSAND_LIGHTS", "Greams Road", "secondary", 35),
    ("N_EGMORE", "N_CHETPET", "Dr Guruswamy Bridge", "primary", 40),
    ("N_CHETPET", "N_LOYOLA", "Sterling Road", "primary", 40),
    ("N_LOYOLA", "N_TNAGAR_PANAGAL", "G.N. Chetty Road", "primary", 40),
    ("N_LOYOLA", "N_KODAMBAKKAM_BR", "Nelson Manickam Road", "primary", 40),
    ("N_THOUSAND_LIGHTS", "N_TNAGAR_PANAGAL", "Venkatnarayana Road Link", "secondary", 35),

    # 6. T. Nagar & Kodambakkam Arterials
    ("N_TNAGAR_PANAGAL", "N_TNAGAR_USMAN", "Usman Road", "secondary", 30),
    ("N_TNAGAR_USMAN", "N_TNAGAR_MADLEY", "Madley Subway Link", "secondary", 30),
    ("N_TNAGAR_MADLEY", "N_SAIDAPET_METRO", "Jones Road / Saidapet North", "secondary", 35),
    ("N_TEYNAMPET", "N_TNAGAR_PANAGAL", "Eldams Road / Burkit Rd", "secondary", 35),
    ("N_NANDANAM", "N_TNAGAR_PANAGAL", "Chamiers Rd to Panagal Park", "secondary", 35),
    ("N_KODAMBAKKAM_BR", "N_VADAPALANI", "Arcot Road", "primary", 45),
    ("N_VADAPALANI", "N_ASHOK_PILLAR", "Inner Ring Road (100 Feet Rd)", "trunk", 55),
    ("N_KOYAMBEDU", "N_VADAPALANI", "Inner Ring Road (100 Feet Rd)", "trunk", 55),

    # 7. Inner Ring Road (100 Feet Road: Vadapalani to Kathipara)
    ("N_ASHOK_PILLAR", "N_JAFFERKHANPET_BR", "100 Feet Road", "trunk", 50),
    ("N_JAFFERKHANPET_BR", "N_EKKATTUTHANGAL", "Jafferkhanpet Adyar Bridge", "trunk", 40), # Adyar bridge
    ("N_EKKATTUTHANGAL", "N_KATHIPARA", "Inner Ring Rd to Kathipara", "trunk", 55),
    ("N_EKKATTUTHANGAL", "N_GUINDY_RACE", "CIPET / Guindy Link", "secondary", 40),

    # 8. Sardar Patel Road & Adyar Corridor
    ("N_KATHIPARA", "N_GUINDY_RACE", "Kathipara to Guindy Racecourse", "trunk", 55),
    ("N_GUINDY_RACE", "N_MADHYA_KAILASH", "Sardar Patel Road", "trunk", 55),
    ("N_MADHYA_KAILASH", "N_IIT_MADRAS", "Sardar Patel Rd - IIT Main Gate", "primary", 45),
    ("N_IIT_MADRAS", "N_TARAMANI_TIDEL", "Velachery - Taramani IIT Gate", "secondary", 40),
    ("N_NANDANAM", "N_KOTTURPURAM_BR", "Turnbulls Road to Bridge", "secondary", 35),
    ("N_KOTTURPURAM_BR", "N_MADHYA_KAILASH", "Gandhi Mandapam Road", "primary", 45), # River crossing
    ("N_MADHYA_KAILASH", "N_ADYAR_DEPOT", "Lattice Bridge Road (L.B. Rd)", "primary", 45),
    ("N_ADYAR_DEPOT", "N_THIRUVANMIYUR_SIG", "L.B. Road South", "primary", 45),
    ("N_MYLAPORE", "N_TEYNAMPET", "Eldams Road", "secondary", 35),
    ("N_MYLAPORE", "N_NANDANAM", "Chamiers Road", "secondary", 35),

    # 9. OMR (Rajiv Gandhi Salai IT Expressway)
    ("N_MADHYA_KAILASH", "N_TARAMANI_TIDEL", "Rajiv Gandhi Salai (OMR)", "trunk", 60),
    ("N_TARAMANI_TIDEL", "N_PERUNGUDI", "Rajiv Gandhi Salai (OMR)", "trunk", 60),
    ("N_PERUNGUDI", "N_THORAIPAKKAM", "Rajiv Gandhi Salai (OMR)", "trunk", 60),
    ("N_THORAIPAKKAM", "N_SHOLINGANALLUR", "Rajiv Gandhi Salai (OMR)", "trunk", 65),

    # 10. ECR (East Coast Road)
    ("N_THIRUVANMIYUR_SIG", "N_KOTTIVAKKAM", "East Coast Road (ECR)", "trunk", 55),
    ("N_KOTTIVAKKAM", "N_NEELANKARAI", "East Coast Road (ECR)", "trunk", 55),
    ("N_NEELANKARAI", "N_INJAMBAKKAM", "East Coast Road (ECR)", "trunk", 60),
    ("N_INJAMBAKKAM", "N_SHOLINGANALLUR", "Kalaignar Karunanidhi Salai (ECR-OMR Link)", "primary", 50),

    # 11. Velachery & South-Central Cross Links
    ("N_GUINDY_RACE", "N_VELACHERY_GURU", "Velachery Checkpost Road", "primary", 45),
    ("N_VELACHERY_GURU", "N_VELACHERY_VIJAYA", "Velachery Bypass Road", "primary", 45),
    ("N_VELACHERY_VIJAYA", "N_VELACHERY_MRTS", "Velachery Station Road", "secondary", 35),
    ("N_VELACHERY_VIJAYA", "N_DHANDESWARAM", "Velachery Main Road", "secondary", 35),
    ("N_DHANDESWARAM", "N_MADIPAKKAM", "Velachery - Madipakkam Link", "secondary", 35),
    ("N_MADIPAKKAM", "N_KOVILAMBAKKAM", "Keelkattalai 200Ft Link", "primary", 45),
    ("N_KOVILAMBAKKAM", "N_MEDAVAKKAM", "Medavakkam Main Road", "primary", 45),
    ("N_MEDAVAKKAM", "N_SHOLINGANALLUR", "Medavakkam - Sholinganallur Road", "primary", 50),
    ("N_VELACHERY_VIJAYA", "N_PALLIKARANAI", "Pallikaranai Wetland Rd", "primary", 40),
    ("N_PALLIKARANAI", "N_THORAIPAKKAM", "200 Feet Radial Road to OMR", "trunk", 55),
    ("N_KOVILAMBAKKAM", "N_THORAIPAKKAM", "200 Feet Radial Road Central", "trunk", 55),
    ("N_TARAMANI_TIDEL", "N_VELACHERY_VIJAYA", "Taramani Link Road", "primary", 45),

    # 12. Mount-Poonamallee Road & Porur/Trade Centre
    ("N_KATHIPARA", "N_TRADE_CENTRE", "Mount-Poonamallee Road", "trunk", 50),
    ("N_TRADE_CENTRE", "N_RAMAPURAM", "Mount-Poonamallee Road", "trunk", 50),
    ("N_RAMAPURAM", "N_MANAPAKKAM_BR", "Manapakkam Adyar River Bridge", "primary", 45), # River bridge
    ("N_MANAPAKKAM_BR", "N_PORUR_JN", "Mount-Poonamallee Road to Porur", "trunk", 50),
    ("N_PORUR_JN", "N_MADURAVOYAL", "Porur - Maduravoyal Bypass Link", "trunk", 60),
    ("N_PORUR_JN", "N_CH_BYPASS_PORUR", "Chennai Bypass Entry Porur", "motorway", 70),
    ("N_VADAPALANI", "N_PORUR_JN", "Arcot Road West", "primary", 45),

    # 13. GST Road Corridor (South to Tambaram)
    ("N_KATHIPARA", "N_AIRPORT", "GST Road (Grand Southern Trunk)", "motorway", 65),
    ("N_AIRPORT", "N_PALLAVARAM", "GST Road", "motorway", 65),
    ("N_PALLAVARAM", "N_KOVILAMBAKKAM", "200 Feet Radial Road West", "trunk", 55),
    ("N_PALLAVARAM", "N_CHROMEPET", "GST Road", "trunk", 60),
    ("N_CHROMEPET", "N_TAMBARAM_SANAT", "GST Road", "trunk", 60),
    ("N_TAMBARAM_SANAT", "N_TAMBARAM_MEPZ", "GST Road", "trunk", 60),
    ("N_TAMBARAM_MEPZ", "N_TAMBARAM_MCC", "Tambaram East Railway Flyover", "primary", 45),
    ("N_TAMBARAM_MEPZ", "N_MUDICHUR_JN", "Mudichur Road", "secondary", 35), # Adyar headwaters
    ("N_MUDICHUR_JN", "N_CH_BYPASS_TAMBARAM", "Mudichur Bypass Link", "secondary", 40),
    ("N_TAMBARAM_MCC", "N_MEDAVAKKAM", "Velachery - Tambaram Main Road", "primary", 45),

    # 14. Chennai Bypass High-Speed Artery
    ("N_MADURAVOYAL", "N_CH_BYPASS_PORUR", "Chennai Bypass Expressway", "motorway", 80),
    ("N_CH_BYPASS_PORUR", "N_CH_BYPASS_TAMBARAM", "Chennai Bypass Expressway", "motorway", 80),
    ("N_CH_BYPASS_TAMBARAM", "N_TAMBARAM_MEPZ", "Tambaram Bypass Interchange", "motorway", 70),
    ("N_AMBATTUR", "N_MADURAVOYAL", "Ambattur - Maduravoyal Bypass Link", "trunk", 65),
]

edges_list = []
edge_id_counter = 1

for src, tgt, r_name, r_type, spd in connections:
    node_a = nodes_dict[src]
    node_b = nodes_dict[tgt]
    dist_km = haversine(node_a["lat"], node_a["lon"], node_b["lat"], node_b["lon"])
    # Ensure realistic non-zero length
    dist_km = max(dist_km, 0.4)

    is_bridge = node_a["is_bridge"] or node_b["is_bridge"] or ("Bridge" in r_name)
    is_elevated = node_a["is_elevated"] or node_b["is_elevated"] or ("Flyover" in r_name) or ("Expressway" in r_name)

    # Forward edge
    edges_list.append({
        "id": f"E_{edge_id_counter:04d}",
        "source": src,
        "target": tgt,
        "road_name": r_name,
        "road_type": r_type,
        "distance_km": dist_km,
        "speed_kmh": spd,
        "is_bridge": is_bridge,
        "is_elevated": is_elevated
    })
    edge_id_counter += 1

    # Backward edge (bidirectional road)
    edges_list.append({
        "id": f"E_{edge_id_counter:04d}",
        "source": tgt,
        "target": src,
        "road_name": r_name,
        "road_type": r_type,
        "distance_km": dist_km,
        "speed_kmh": spd,
        "is_bridge": is_bridge,
        "is_elevated": is_elevated
    })
    edge_id_counter += 1

dataset = {
    "city": "Chennai",
    "nodes": list(nodes_dict.values()),
    "edges": edges_list
}

with open("backend/app/data/chennai_roads.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2)

print(f"Generated chennai_roads.json: {len(nodes_dict)} nodes, {len(edges_list)} edges.")
