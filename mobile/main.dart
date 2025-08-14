import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:async'; // Required for Future.delayed

/// ----------- MOCK DATA SIMULATION -----------
class MockDatabase {
  static final List<Car> _mockCars = <Car>[
    Car(
      id: 'car_1',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      pricePerDay: 50.0,
      imageUrl: 'https://www.gstatic.com/flutter-onestack-prototype/genui/example_1.jpg',
      description: 'Une berline confortable et fiable, parfaite pour la conduite en ville et les longs trajets.',
      fuelType: 'Essence',
      transmission: 'Automatique',
      seats: 5,
      rating: 4.7,
      category: 'Compact',
      features: <String>['Climatisation', 'GPS', 'Bluetooth'],
      isAvailable: true,
      location: Location(address: '123 Rue Principale', city: 'Paris', zipCode: '75001'),
    ),
    Car(
      id: 'car_2',
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      pricePerDay: 120.0,
      imageUrl: 'https://www.gstatic.com/flutter-onestack-prototype/genui/example_1.jpg',
      description: 'Découvrez l\'avenir avec cette berline électrique premium. Rapide, élégante et écologique.',
      fuelType: 'Électrique',
      transmission: 'Automatique',
      seats: 5,
      rating: 4.9,
      category: 'Électrique Premium',
      features: <String>['Autopilot', 'Écran tactile', 'Charge rapide'],
      isAvailable: true,
      location: Location(address: '456 Avenue des Chênes', city: 'Lyon', zipCode: '69001'),
    ),
    Car(
      id: 'car_3',
      make: 'Mercedes-Benz',
      model: 'GLC',
      year: 2021,
      pricePerDay: 90.0,
      imageUrl: 'https://www.gstatic.com/flutter-onestack-prototype/genui/example_1.jpg',
      description: 'Un SUV luxueux et spacieux, idéal pour les aventures en famille et les voyages confortables.',
      fuelType: 'Diesel',
      transmission: 'Automatique',
      seats: 5,
      rating: 4.8,
      category: 'SUV Premium',
      features: <String>['Toit ouvrant', 'Sièges chauffants', 'Caméra de recul'],
      isAvailable: true,
      location: Location(address: '789 Chemin des Pins', city: 'Marseille', zipCode: '13001'),
    ),
    Car(
      id: 'car_4',
      make: 'Porsche',
      model: '911 Carrera',
      year: 2020,
      pricePerDay: 250.0,
      imageUrl: 'https://www.gstatic.com/flutter-onestack-prototype/genui/example_1.jpg',
      description: 'Libérez le démon de la vitesse qui est en vous avec cette voiture de sport emblématique. Une expérience de conduite inoubliable.',
      fuelType: 'Essence',
      transmission: 'Manuelle',
      seats: 2,
      rating: 4.9,
      category: 'Sport Premium',
      features: <String>['Spoiler actif', 'Sièges sport', 'Échappement sport'],
      isAvailable: false, // Example of unavailable car
      location: Location(address: '101 Allée des Cèdres', city: 'Nice', zipCode: '06000'),
    ),
    Car(
      id: 'car_5',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2019,
      pricePerDay: 40.0,
      imageUrl: 'https://www.gstatic.com/flutter-onestack-prototype/genui/example_1.jpg',
      description: 'Une voiture pratique et économique, idéale pour les trajets quotidiens et les courts déplacements.',
      fuelType: 'Essence',
      transmission: 'Manuelle',
      seats: 5,
      rating: 4.2,
      category: 'Compact',
      features: <String>['Radio CD', 'Vitres électriques'],
      isAvailable: true,
      location: Location(address: '202 Rue des Bouleaux', city: 'Bordeaux', zipCode: '33000'),
    ),
  ];

  static final List<User> _mockUsers = <User>[
    User(id: 'user_1', username: 'TestUser', email: 'test@example.com', phone: '0123456789'),
  ];
  static const String _testPassword = '1234';

  static final List<Booking> _mockBookings = <Booking>[];

  static Future<List<Car>> getCars() async {
    await Future<void>.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return List<Car>.from(_mockCars); // Return all cars, filtering for availability happens in provider
  }

  static Future<List<Car>> searchCars({
    String? query,
    String? category,
    double? maxPrice,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 500)); // Simulate network delay

    return _mockCars.where((Car car) {
      final bool matchesQuery = query == null || query.isEmpty ||
          car.make.toLowerCase().contains(query.toLowerCase()) ||
          car.model.toLowerCase().contains(query.toLowerCase());

      final bool matchesCategory = category == null || category == 'Tous' || car.category == category;

      final bool matchesPrice = maxPrice == null || car.pricePerDay <= maxPrice;

      return matchesQuery && matchesCategory && matchesPrice && car.isAvailable;
    }).toList();
  }

  static Future<User?> login(String email, String password) async {
    await Future<void>.delayed(const Duration(milliseconds: 700)); // Simulate network delay
    if (email == 'test@example.com' && password == _testPassword) {
      return _mockUsers.firstWhere((User user) => user.email == email);
    }
    return null;
  }

  static Future<User?> register(
    String username,
    String email,
    String password,
    String? phone,
  ) async {
    await Future<void>.delayed(const Duration(milliseconds: 700)); // Simulate network delay
    // Check if user already exists
    if (_mockUsers.any((User user) => user.email == email)) {
      return null; // User already exists
    }

    final String newId = 'user_${_mockUsers.length + 1}';
    final User newUser = User(
      id: newId,
      username: username,
      email: email,
      phone: phone,
    );
    _mockUsers.add(newUser); // Add to mock database (simplistic for mock)
    return newUser;
  }

  static Future<Booking?> createBooking({
    required String userId,
    required String carId,
    required DateTime startDate,
    required DateTime endDate,
    required double totalPrice,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 700)); // Simulate network delay
    final String newId = 'booking_${_mockBookings.length + 1}';
    final Booking newBooking = Booking(
      id: newId,
      userId: userId,
      carId: carId,
      startDate: startDate,
      endDate: endDate,
      totalPrice: totalPrice,
      status: BookingStatus.pending,
    );
    _mockBookings.add(newBooking);
    return newBooking;
  }

  static Future<List<Booking>> getUserBookings(String userId) async {
    await Future<void>.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return _mockBookings.where((Booking b) => b.userId == userId).toList();
  }
}

/// ----------- SERVICES API (MOCK) -----------
class ApiService {
  static Future<List<Car>?> getCars() async {
    try {
      return await MockDatabase.getCars();
    } catch (e) {
      print('Erreur lors de la récupération des voitures (mock): $e');
      return null;
    }
  }

  static Future<List<Car>?> searchCars({
    String? query,
    String? category,
    double? maxPrice,
  }) async {
    try {
      return await MockDatabase.searchCars(
        query: query,
        category: category,
        maxPrice: maxPrice,
      );
    } catch (e) {
      print('Erreur lors de la recherche des voitures (mock): $e');
      return null;
    }
  }

  static Future<User?> login(String email, String password) async {
    try {
      return await MockDatabase.login(email, password);
    } catch (e) {
      print('Erreur lors de la connexion (mock): $e');
      return null;
    }
  }

  static Future<User?> register(
    String username,
    String email,
    String password,
    String? phone,
  ) async {
    try {
      return await MockDatabase.register(username, email, password, phone);
    } catch (e) {
      print('Erreur lors de l\'inscription (mock): $e');
      return null;
    }
  }

  static Future<Booking?> createBooking({
    required String userId,
    required String carId,
    required DateTime startDate,
    required DateTime endDate,
    required double totalPrice,
  }) async {
    try {
      return await MockDatabase.createBooking(
        userId: userId,
        carId: carId,
        startDate: startDate,
        endDate: endDate,
        totalPrice: totalPrice,
      );
    } catch (e) {
      print('Erreur lors de la création de la réservation (mock): $e');
      return null;
    }
  }

  static Future<List<Booking>?> getUserBookings(String userId) async {
    try {
      return await MockDatabase.getUserBookings(userId);
    } catch (e) {
      print('Erreur lors de la récupération des réservations (mock): $e');
      return null;
    }
  }
}

/// ----------- DATA MODELS -----------
class Car {
  final String id;
  final String make;
  final String model;
  final int year;
  final double pricePerDay;
  final String imageUrl;
  final String description;
  final String fuelType;
  final String transmission;
  final int seats;
  final double rating;
  final String category;
  final List<String> features;
  final bool isAvailable;
  final Location? location;

  Car({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    required this.pricePerDay,
    required this.imageUrl,
    required this.description,
    required this.fuelType,
    required this.transmission,
    required this.seats,
    this.rating = 4.5,
    this.category = 'Standard',
    this.features = const <String>[],
    this.isAvailable = true,
    this.location,
  });

  factory Car.fromJson(Map<String, dynamic> json) {
    return Car(
      id: json['id'] ?? '', // Changed from _id?.toHexString()
      make: json['make'] ?? '',
      model: json['model'] ?? '',
      year: json['year'] ?? 0,
      pricePerDay: (json['price_per_day'] ?? 0).toDouble(),
      imageUrl: json['image_url'] ?? '',
      description: json['description'] ?? '',
      fuelType: json['fuel_type'] ?? '',
      transmission: json['transmission'] ?? '',
      seats: json['seats'] ?? 0,
      rating: (json['rating'] ?? 0).toDouble(),
      category: json['category'] ?? '',
      features: List<String>.from(json['features'] ?? <dynamic>[]),
      isAvailable: json['is_available'] ?? true,
      location: json['location'] != null
          ? Location.fromJson(json['location'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'make': make,
      'model': model,
      'year': year,
      'price_per_day': pricePerDay,
      'image_url': imageUrl,
      'description': description,
      'fuel_type': fuelType,
      'transmission': transmission,
      'seats': seats,
      'rating': rating,
      'category': category,
      'features': features,
      'is_available': isAvailable,
      'location': location?.toJson(),
    };
  }
}

class Location {
  final String address;
  final String city;
  final String zipCode;
  final double? latitude;
  final double? longitude;

  Location({
    required this.address,
    required this.city,
    required this.zipCode,
    this.latitude,
    this.longitude,
  });

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      zipCode: json['zip_code'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'address': address,
      'city': city,
      'zip_code': zipCode,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class User {
  final String id;
  final String username;
  final String email;
  final String? phone;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.phone,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '', // Changed from _id?.toHexString()
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{'id': id, 'username': username, 'email': email, 'phone': phone};
  }
}

class Booking {
  final String id;
  final String carId;
  final String userId;
  final DateTime startDate;
  final DateTime endDate;
  final double totalPrice;
  final BookingStatus status;

  Booking({
    required this.id,
    required this.carId,
    required this.userId,
    required this.startDate,
    required this.endDate,
    required this.totalPrice,
    this.status = BookingStatus.pending,
  });

  int get durationDays => endDate.difference(startDate).inDays + 1;

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? '', // Changed from _id?.toHexString()
      carId: json['car_id'] ?? '',
      userId: json['user_id'] ?? '',
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      status: BookingStatus.values.firstWhere(
        (BookingStatus e) => e.toString().split('.').last == (json['status'] ?? 'pending'),
        orElse: () => BookingStatus.pending,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'car_id': carId,
      'user_id': userId,
      'start_date': startDate.toIso8601String(),
      'end_date': endDate.toIso8601String(),
      'total_price': totalPrice,
      'status': status.toString().split('.').last,
    };
  }
}

enum BookingStatus { pending, confirmed, completed, cancelled }

/// ----------- THEME DATA -----------
class AppTheme {
  static const Color primaryColor = Color(0xFF2196F3);
  static const Color secondaryColor = Color(0xFF03DAC6);
  static const Color errorColor = Color(0xFFE53935);
  static const Color successColor = Color(0xFF43A047);
  static const Color warningColor = Color(0xFFFB8C00);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      error: errorColor,
      secondary: secondaryColor,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
      foregroundColor: Colors.black,
    ),
    cardTheme: CardThemeData( // Fixed: CardThemeData was CardTheme
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      shadowColor: Colors.black26,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
      fillColor: Colors.grey.shade100,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
      error: errorColor,
      secondary: secondaryColor,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
      fillColor: Colors.grey.shade800,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );
}

// Helper for transparent colors
Color withAlpha(Color color, double opacity) {
  final int alpha = (255 * opacity).round().clamp(0, 255);
  return color.withAlpha(alpha);
}

/// ----------- PROVIDERS -----------
class CarProvider extends ChangeNotifier {
  List<Car> _cars = <Car>[];
  List<Car> _filteredCars = <Car>[];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';
  String _selectedCategory = 'Tous';
  double _maxPrice = 500;
  bool _dataLoadedSuccessfully = false; // Renamed from _isConnected

  // Getters
  List<Car> get cars => _filteredCars;
  List<Car> get allCars => _cars;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get dataLoadedSuccessfully => _dataLoadedSuccessfully;

  List<String> get categories => <String>[
    'Tous',
    'Compact',
    'SUV Premium',
    'Électrique Premium',
    'Sport Premium',
  ];

  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;
  double get maxPrice => _maxPrice;

  // Load cars from mock data
  Future<void> loadCars() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('🔄 Chargement des données simulées de voitures...');
      final List<Car>? cars = await ApiService.getCars();

      if (cars != null) {
        _cars = cars;
        _applyFilters();
        _dataLoadedSuccessfully = true;
        print('✅ ${_cars.length} voitures chargées depuis les données simulées');
      } else {
        _error = 'Impossible de charger les voitures depuis les données simulées';
        _dataLoadedSuccessfully = false;
        print('❌ Erreur chargement données simulées');
      }
    } catch (e) {
      _error = 'Erreur chargement données: $e';
      _dataLoadedSuccessfully = false;
      print('❌ Erreur chargement données: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  // Search cars via mock data
  Future<void> searchCars() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print(
        '🔍 Recherche dans les données simulées: query="$_searchQuery", category="$_selectedCategory", maxPrice=$_maxPrice',
      );

      final List<Car>? cars = await ApiService.searchCars(
        query: _searchQuery.isEmpty ? null : _searchQuery,
        category: _selectedCategory,
        maxPrice: _maxPrice,
      );

      if (cars != null) {
        _filteredCars = cars;
        _dataLoadedSuccessfully = true;
        print('✅ ${_filteredCars.length} voitures trouvées');
      } else {
        _error = 'Erreur lors de la recherche dans les données simulées';
        _dataLoadedSuccessfully = false;
        print('❌ Erreur recherche données simulées');
      }
    } catch (e) {
      _error = 'Erreur recherche données simulées: $e';
      _dataLoadedSuccessfully = false;
      print('❌ Erreur recherche données simulées: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  // Local filters
  void _applyFilters() {
    _filteredCars = _cars.where((Car car) {
      final bool matchesSearch =
          car.make.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          car.model.toLowerCase().contains(_searchQuery.toLowerCase());
      final bool matchesCategory =
          _selectedCategory == 'Tous' || car.category == _selectedCategory;
      final bool matchesPrice = car.pricePerDay <= _maxPrice;
      return matchesSearch &&
          matchesCategory &&
          matchesPrice &&
          car.isAvailable;
    }).toList();
  }

  void updateSearchQuery(String query) {
    _searchQuery = query;
    searchCars();
  }

  void updateCategory(String category) {
    _selectedCategory = category;
    searchCars();
  }

  void updateMaxPrice(double price) {
    _maxPrice = price;
    _applyFilters();
    notifyListeners();
  }

  Car? getCarById(String id) {
    try {
      return _cars.firstWhere((Car car) => car.id == id);
    } catch (e) {
      return null;
    }
  }

  Future<void> refresh() async {
    await loadCars();
  }
}

class UserProvider extends ChangeNotifier {
  User? _currentUser;
  bool _isDarkMode = false;
  bool _isLoading = false;
  String? _error;

  bool get isLoggedIn => _currentUser != null;
  User? get currentUser => _currentUser;
  bool get isDarkMode => _isDarkMode;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('🔐 Tentative connexion utilisateur (données simulées)');
      final User? user = await ApiService.login(email, password);

      if (user != null) {
        _currentUser = user;
        print('✅ Connexion réussie: ${user.username}');
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Identifiants invalides';
        print('❌ Échec connexion');
      }
    } catch (e) {
      _error = 'Erreur de connexion: $e';
      print('❌ Erreur connexion: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> signup(
    String username,
    String email,
    String password,
    String? phone,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('📝 Tentative inscription utilisateur (données simulées)');
      final User? user = await ApiService.register(username, email, password, phone);

      if (user != null) {
        _currentUser = user;
        print('✅ Inscription réussie: ${user.username}');
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Erreur lors de l\'inscription';
        print('❌ Échec inscription');
      }
    } catch (e) {
      _error = 'Erreur d\'inscription: $e';
      print('❌ Erreur inscription: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  void logout() {
    _currentUser = null;
    print('👋 Déconnexion utilisateur');
    notifyListeners();
  }

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }
}

class BookingProvider extends ChangeNotifier {
  final List<Booking> _bookings = <Booking>[];
  bool _isLoading = false;
  String? _error;

  List<Booking> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<Booking> getBookingsForUser(String userId) {
    return _bookings.where((Booking booking) => booking.userId == userId).toList();
  }

  Future<void> loadUserBookings(String userId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('📅 Chargement réservations (données simulées) pour utilisateur: $userId');
      final List<Booking>? bookings = await ApiService.getUserBookings(userId);

      if (bookings != null) {
        _bookings.clear();
        _bookings.addAll(bookings);
        print('✅ ${_bookings.length} réservations chargées');
      } else {
        _error = 'Erreur lors du chargement des réservations';
        print('❌ Échec chargement réservations');
      }
    } catch (e) {
      _error = 'Erreur chargement réservations: $e';
      print('❌ Erreur chargement réservations: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> addBooking({
    required String userId,
    required String carId,
    required DateTime startDate,
    required DateTime endDate,
    required double totalPrice,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('📅 Création réservation (données simulées): $carId');
      final Booking? booking = await ApiService.createBooking(
        userId: userId,
        carId: carId,
        startDate: startDate,
        endDate: endDate,
        totalPrice: totalPrice,
      );

      if (booking != null) {
        _bookings.add(booking);
        print('✅ Réservation créée: ${booking.id}');
      } else {
        _error = 'Erreur lors de la création de la réservation';
        print('❌ Échec création réservation');
      }
    } catch (e) {
      _error = 'Erreur création réservation: $e';
      print('❌ Erreur création réservation: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void updateBookingStatus(String bookingId, BookingStatus status) {
    final int index = _bookings.indexWhere((Booking booking) => booking.id == bookingId);
    if (index != -1) {
      // Local update (should be synchronized with mock data source if it were persistent)
      print('🔄 Mise à jour statut réservation: $bookingId -> $status');
    }
    notifyListeners();
  }
}

/// ----------- APP ENTRY -----------
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  print('🚀 Démarrage VitaRenta avec données simulées');

  runApp(
    MultiProvider(
      providers: <ChangeNotifierProvider<ChangeNotifier>>[
        ChangeNotifierProvider<CarProvider>(create: (_) => CarProvider()),
        ChangeNotifierProvider<UserProvider>(create: (_) => UserProvider()),
        ChangeNotifierProvider<BookingProvider>(
          create: (_) => BookingProvider(),
        ),
      ],
      builder: (BuildContext context, Widget? child) => const CarRentalApp(),
    ),
  );
}

class CarRentalApp extends StatelessWidget {
  const CarRentalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (BuildContext context, UserProvider userProvider, Widget? child) {
        return MaterialApp(
          title: 'VitaRenta',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: userProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
          home: const SplashScreen(),
          routes: <String, WidgetBuilder>{
            '/login': (BuildContext context) => const LoginView(),
            '/signup': (BuildContext context) => const SignUpView(),
            '/home': (BuildContext context) => const MainNavigationView(),
            '/bookings': (BuildContext context) => const BookingsView(),
            '/profile': (BuildContext context) => const ProfileView(),
          },
        );
      },
    );
  }
}

/// ----------- SPLASH SCREEN -----------
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.elasticOut),
    );

    _animationController.forward();
    _initializeApp();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _initializeApp() async {
    // Initialize data loading
    final CarProvider carProvider = context.read<CarProvider>();
    await carProvider.loadCars();

    // Navigate to the main screen after 2 seconds
    await Future<void>.delayed(const Duration(seconds: 2));

    if (mounted) {
      final UserProvider userProvider = context.read<UserProvider>();
      Navigator.pushReplacement(
        context,
        PageRouteBuilder<void>(
          pageBuilder:
              (
                BuildContext context,
                Animation<double> animation,
                Animation<double> secondaryAnimation,
              ) => userProvider.isLoggedIn
              ? const MainNavigationView()
              : const LoginView(),
          transitionsBuilder:
              (
                BuildContext context,
                Animation<double> animation,
                Animation<double> secondaryAnimation,
                Widget child,
              ) {
                return FadeTransition(opacity: animation, child: child);
              },
          transitionDuration: const Duration(milliseconds: 500),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.secondary,
            ],
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(51), // 0.2 * 255 ≈ 51
                      shape: BoxShape.circle,
                      boxShadow: <BoxShadow>[
                        BoxShadow(
                          color: Colors.black.withAlpha(26), // 0.1 * 255 ≈ 26
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.directions_car_rounded,
                      size: 80,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'VitaRenta',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Votre partenaire de mobilité', // Changed text
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withAlpha(204), // 0.8 * 255 ≈ 204
                    ),
                  ),
                  const SizedBox(height: 48),
                  Consumer<CarProvider>(
                    builder:
                        (
                          BuildContext context,
                          CarProvider carProvider,
                          Widget? child,
                        ) {
                          return Column(
                            children: <Widget>[
                              const SizedBox(
                                width: 40,
                                height: 40,
                                child: CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                  strokeWidth: 3,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                carProvider.isLoading
                                    ? 'Chargement des données...' // Changed text
                                    : carProvider.error != null
                                    ? 'Mode local' // Changed text
                                    : 'Données chargées!',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                ),
                              ),
                              if (carProvider.error != null) ...<Widget>[
                                const SizedBox(height: 8),
                                Text(
                                  'Utilisation des données locales',
                                  style: TextStyle(
                                    color: Colors.white.withAlpha(
                                      179,
                                    ), // 0.7 * 255 ≈ 179
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ],
                          );
                        },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// ----------- MAIN NAVIGATION -----------
class MainNavigationView extends StatefulWidget {
  const MainNavigationView({super.key});

  @override
  State<MainNavigationView> createState() => _MainNavigationViewState();
}

class _MainNavigationViewState extends State<MainNavigationView> {
  int _currentIndex = 0;

  final List<Widget> _pages = const <Widget>[
    HomeView(),
    ExploreView(),
    BookingsView(),
    ProfileView(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (int index) =>
            setState(() => _currentIndex = index),
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Accueil',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search),
            label: 'Explorer',
          ),
          NavigationDestination(
            icon: Icon(Icons.book_outlined),
            selectedIcon: Icon(Icons.book),
            label: 'Réservations',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

/// ----------- LOGIN SCREEN -----------
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> with TickerProviderStateMixin {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: Curves.easeInOut,
          ),
        );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    final UserProvider userProvider = context.read<UserProvider>();
    final bool success = await userProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (mounted) {
      if (success) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder<void>(
            pageBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                ) => const MainNavigationView(),
            transitionsBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                  Widget child,
                ) {
                  return FadeTransition(opacity: animation, child: child);
                },
            transitionDuration: const Duration(milliseconds: 500),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: <Widget>[
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(userProvider.error ?? 'Identifiants invalides'),
                ),
              ],
            ),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              withAlpha(theme.colorScheme.primary, 0.1),
              withAlpha(theme.colorScheme.secondary, 0.1),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: SlideTransition(
                  position: _slideAnimation,
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        // Logo et titre
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: withAlpha(theme.colorScheme.primary, 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.directions_car_rounded,
                            size: 60,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          "VitaRenta",
                          style: theme.textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Location de voitures",
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 48),
                        // Champs de connexion
                        Card(
                          elevation: 8,
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              children: <Widget>[
                                TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (String? value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Veuillez saisir votre email';
                                    }
                                    if (!RegExp(
                                      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                                    ).hasMatch(value)) {
                                      return 'Veuillez saisir un email valide';
                                    }
                                    return null;
                                  },
                                  decoration: const InputDecoration(
                                    labelText: 'Adresse e-mail',
                                    hintText: 'test@example.com',
                                    prefixIcon: Icon(Icons.email_outlined),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  controller: _passwordController,
                                  obscureText: _obscurePassword,
                                  validator: (String? value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Veuillez saisir votre mot de passe';
                                    }
                                    return null;
                                  },
                                  decoration: InputDecoration(
                                    labelText: 'Mot de passe',
                                    hintText: '••••••••',
                                    prefixIcon: const Icon(Icons.lock_outlined),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                      ),
                                      onPressed: () => setState(
                                        () => _obscurePassword =
                                            !_obscurePassword,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Consumer<UserProvider>(
                                  builder:
                                      (
                                        BuildContext context,
                                        UserProvider userProvider,
                                        Widget? child,
                                      ) {
                                        return SizedBox(
                                          width: double.infinity,
                                          height: 48,
                                          child: FilledButton(
                                            onPressed: userProvider.isLoading
                                                ? null
                                                : _login,
                                            child: userProvider.isLoading
                                                ? const SizedBox(
                                                    height: 20,
                                                    width: 20,
                                                    child: CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      valueColor:
                                                          AlwaysStoppedAnimation<
                                                            Color
                                                          >(Colors.white),
                                                    ),
                                                  )
                                                : const Text("Se connecter"),
                                          ),
                                        );
                                      },
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              PageRouteBuilder<void>(
                                pageBuilder:
                                    (
                                      BuildContext context,
                                      Animation<double> animation,
                                      Animation<double> secondaryAnimation,
                                    ) => const SignUpView(),
                                transitionsBuilder:
                                    (
                                      BuildContext context,
                                      Animation<double> animation,
                                      Animation<double> secondaryAnimation,
                                      Widget child,
                                    ) {
                                      return SlideTransition(
                                        position: animation.drive(
                                          Tween<Offset>(
                                            begin: const Offset(1.0, 0.0),
                                            end: Offset.zero,
                                          ),
                                        ),
                                        child: child,
                                      );
                                    },
                                transitionDuration: const Duration(
                                  milliseconds: 500,
                                ),
                              ),
                            );
                          },
                          child: const Text("Créer un compte"),
                        ),
                        const SizedBox(height: 16),
                        // Removed MongoDB info box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.withAlpha(26), // 0.1 * 255 ≈ 26
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.blue.withAlpha(
                                77,
                              ), // 0.3 * 255 ≈ 77
                            ),
                          ),
                          child: Column(
                            children: <Widget>[
                              Text(
                                "💾 Données Simulé", // Changed text
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue[700],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Test: test@example.com / 1234",
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: Colors.grey[600],
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// ----------- SIGNUP SCREEN -----------
class SignUpView extends StatefulWidget {
  const SignUpView({super.key});

  @override
  State<SignUpView> createState() => _SignUpViewState();
}

class _SignUpViewState extends State<SignUpView>
    with SingleTickerProviderStateMixin {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!_formKey.currentState!.validate()) return;

    final UserProvider userProvider = context.read<UserProvider>();
    final bool success = await userProvider.signup(
      _usernameController.text.trim(),
      _emailController.text.trim(),
      _passwordController.text,
      _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
    );

    if (mounted) {
      if (success) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder<void>(
            pageBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                ) => const MainNavigationView(),
            transitionsBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                  Widget child,
                ) {
                  return FadeTransition(opacity: animation, child: child);
                },
            transitionDuration: const Duration(milliseconds: 500),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: <Widget>[
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    userProvider.error ?? 'Erreur lors de l\'inscription',
                  ),
                ),
              ],
            ),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Créer un compte"),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              children: <Widget>[
                const SizedBox(height: 20),
                TextFormField(
                  controller: _usernameController,
                  validator: (String? value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez saisir votre nom';
                    }
                    if (value.length < 3) {
                      return 'Le nom doit contenir au moins 3 caractères';
                    }
                    return null;
                  },
                  decoration: const InputDecoration(
                    labelText: "Nom complet",
                    prefixIcon: Icon(Icons.person_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: (String? value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez saisir votre email';
                    }
                    if (!RegExp(
                      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                    ).hasMatch(value)) {
                      return 'Veuillez saisir un email valide';
                    }
                    return null;
                  },
                  decoration: const InputDecoration(
                    labelText: "Adresse e-mail",
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: "Téléphone (optionnel)",
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  validator: (String? value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez saisir un mot de passe';
                    }
                    if (value.length < 6) {
                      return 'Le mot de passe doit contenir au moins 6 caractères';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    labelText: "Mot de passe",
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  validator: (String? value) {
                    if (value != _passwordController.text) {
                      return 'Les mots de passe ne correspondent pas';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    labelText: "Confirmer le mot de passe",
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                      onPressed: () => setState(
                        () =>
                            _obscureConfirmPassword = !_obscureConfirmPassword,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                Consumer<UserProvider>(
                  builder:
                      (
                        BuildContext context,
                        UserProvider userProvider,
                        Widget? child,
                      ) {
                        return SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: FilledButton(
                            onPressed: userProvider.isLoading ? null : _signUp,
                            child: userProvider.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : const Text("Créer le compte"),
                          ),
                        );
                      },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// ----------- HOME SCREEN -----------
class HomeView extends StatelessWidget {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    final User? user = context.watch<UserProvider>().currentUser;
    return Scaffold(
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            floating: true,
            backgroundColor: Colors.transparent,
            elevation: 0,
            flexibleSpace: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[
                    withAlpha(Theme.of(context).colorScheme.primary, 0.1),
                    withAlpha(Theme.of(context).colorScheme.secondary, 0.1),
                  ],
                ),
              ),
            ),
            expandedHeight: 120,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Bonjour ${user?.username ?? ""}',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                Text(
                  'Données locales synchronisées', // Changed text
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                ),
              ],
            ),
            actions: <Widget>[
              Consumer<CarProvider>(
                builder:
                    (
                      BuildContext context,
                      CarProvider carProvider,
                      Widget? child,
                    ) {
                      return IconButton(
                        icon: Icon(
                          carProvider.isLoading ? Icons.sync : Icons.cloud_done,
                          color: carProvider.isLoading
                              ? Colors.orange
                              : Colors.green,
                        ),
                        onPressed: carProvider.refresh,
                      );
                    },
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverToBoxAdapter(
              child: Consumer<CarProvider>(
                builder:
                    (
                      BuildContext context,
                      CarProvider carProvider,
                      Widget? child,
                    ) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          // Data Status
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: carProvider.dataLoadedSuccessfully
                                  ? AppTheme.successColor.withAlpha(26)
                                  : AppTheme.warningColor.withAlpha(26),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: carProvider.dataLoadedSuccessfully
                                    ? AppTheme.successColor.withAlpha(77)
                                    : AppTheme.warningColor.withAlpha(77),
                              ),
                            ),
                            child: Row(
                              children: <Widget>[
                                Icon(
                                  carProvider.dataLoadedSuccessfully
                                      ? Icons.check_circle
                                      : Icons.warning,
                                  color: carProvider.dataLoadedSuccessfully
                                      ? AppTheme.successColor
                                      : AppTheme.warningColor,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: <Widget>[
                                      Text(
                                        carProvider.dataLoadedSuccessfully
                                            ? 'Données Connectées' // Changed text
                                            : 'Mode Hors Ligne', // Changed text
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: carProvider.dataLoadedSuccessfully
                                              ? AppTheme.successColor
                                              : AppTheme.warningColor,
                                        ),
                                      ),
                                      Text(
                                        carProvider.dataLoadedSuccessfully
                                            ? '${carProvider.allCars.length} voitures synchronisées'
                                            : 'Utilisation des données locales',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: carProvider.dataLoadedSuccessfully
                                              ? AppTheme.successColor
                                              : AppTheme.warningColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (carProvider.isLoading)
                                  const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          // Quick Stats
                          Row(
                            children: <Widget>[
                              Expanded(
                                child: _buildStatCard(
                                  context,
                                  'Voitures',
                                  '${carProvider.allCars.length}',
                                  Icons.directions_car,
                                  Colors.blue,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildStatCard(
                                  context,
                                  'Disponibles',
                                  '${carProvider.allCars.where((Car c) => c.isAvailable).length}',
                                  Icons.check_circle,
                                  AppTheme.successColor,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildStatCard(
                                  context,
                                  'Statut Data', // Changed text
                                  carProvider.dataLoadedSuccessfully ? 'ON' : 'OFF',
                                  Icons.cloud_done, // Changed icon
                                  carProvider.dataLoadedSuccessfully
                                      ? AppTheme.successColor
                                      : AppTheme.warningColor,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: <Widget>[
                              Text(
                                'Voitures Populaires', // Changed text
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              TextButton.icon(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute<ExploreView>(
                                      builder: (BuildContext context) =>
                                          const ExploreView(),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.search),
                                label: const Text('Explorer'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                        ],
                      );
                    },
              ),
            ),
          ),
          // List of cars
          Consumer<CarProvider>(
            builder:
                (BuildContext context, CarProvider carProvider, Widget? child) {
                  final List<Car> cars = carProvider.cars.take(3).toList();
                  if (carProvider.isLoading) {
                    return const SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    );
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (BuildContext context, int index) => Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: EnhancedCarCard(car: cars[index]),
                        ),
                        childCount: cars.length,
                      ),
                    ),
                  );
                },
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: withAlpha(color, 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: withAlpha(color, 0.3)),
      ),
      child: Column(
        children: <Widget>[
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}

/// ----------- EXPLORE SCREEN -----------
class ExploreView extends StatelessWidget {
  const ExploreView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Explorer les voitures'), // Changed text
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: <Widget>[
          Consumer<CarProvider>(
            builder:
                (BuildContext context, CarProvider carProvider, Widget? child) {
                  return IconButton(
                    icon: Icon(
                      carProvider.isLoading ? Icons.sync : Icons.refresh,
                      color: carProvider.isLoading ? Colors.orange : null,
                    ),
                    onPressed: carProvider.refresh,
                  );
                },
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          // Search bar and filters
          const SearchAndFilters(),
          // List of cars
          Expanded(
            child: Consumer<CarProvider>(
              builder:
                  (
                    BuildContext context,
                    CarProvider carProvider,
                    Widget? child,
                  ) {
                    if (carProvider.isLoading) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: <Widget>[
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text('Recherche de voitures...'), // Changed text
                          ],
                        ),
                      );
                    }
                    final List<Car> cars = carProvider.cars;
                    if (cars.isEmpty) {
                      return const EmptyState();
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: cars.length,
                      itemBuilder: (BuildContext context, int index) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: EnhancedCarCard(car: cars[index]),
                      ),
                    );
                  },
            ),
          ),
        ],
      ),
    );
  }
}

class SearchAndFilters extends StatelessWidget {
  const SearchAndFilters({super.key});

  @override
  Widget build(BuildContext context) {
    final CarProvider carProvider = context.watch<CarProvider>();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: withAlpha(Colors.black, 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: <Widget>[
          // Search bar
          TextField(
            onChanged: carProvider.updateSearchQuery,
            decoration: InputDecoration(
              hintText: 'Rechercher des voitures...', // Changed text
              prefixIcon: const Icon(Icons.search),
              suffixIcon: carProvider.isLoading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : null, // Removed Icons.storage
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.grey[100],
            ),
          ),
          const SizedBox(height: 16),
          // Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: <Widget>[
                ...carProvider.categories.map<Widget>(
                  (String category) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(category),
                      selected: carProvider.selectedCategory == category,
                      onSelected: (bool _) =>
                          carProvider.updateCategory(category),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Text('Prix max: ${carProvider.maxPrice.round()}€'),
              ],
            ),
          ),
          // Slider for price
          Slider(
            value: carProvider.maxPrice,
            min: 40,
            max: 500,
            divisions: 23,
            label: '${carProvider.maxPrice.round()}€',
            onChanged: (double value) => carProvider.updateMaxPrice(value),
          ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(Icons.search_off, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Aucune voiture trouvée',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'Essayez d\'ajuster vos filtres de recherche',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }
}

/// ----------- BOOKINGS SCREEN -----------
class BookingsView extends StatefulWidget {
  const BookingsView({super.key});

  @override
  State<BookingsView> createState() => _BookingsViewState();
}

class _BookingsViewState extends State<BookingsView> {
  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    final UserProvider userProvider = context.read<UserProvider>();
    if (userProvider.isLoggedIn) {
      final BookingProvider bookingProvider = context.read<BookingProvider>();
      await bookingProvider.loadUserBookings(userProvider.currentUser!.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vos Réservations'), // Changed text
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Consumer2<BookingProvider, UserProvider>(
        builder:
            (
              BuildContext context,
              BookingProvider bookingProvider,
              UserProvider userProvider,
              Widget? child,
            ) {
              if (!userProvider.isLoggedIn) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      Icon(
                        Icons.login_outlined,
                        size: 80,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Connectez-vous pour voir vos réservations',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute<LoginView>(
                              builder: (BuildContext context) =>
                                  const LoginView(),
                            ),
                          );
                        },
                        child: const Text('Se connecter'),
                      ),
                    ],
                  ),
                );
              }

              final List<Booking> userBookings = bookingProvider
                  .getBookingsForUser(userProvider.currentUser!.id);

              if (bookingProvider.isLoading) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text('Chargement des réservations...'),
                    ],
                  ),
                );
              }

              if (userBookings.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      Icon(
                        Icons.book_outlined,
                        size: 80,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune réservation',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      Text(
                        'Vos réservations seront stockées localement', // Changed text
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: _loadBookings,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: userBookings.length,
                  itemBuilder: (BuildContext context, int index) =>
                      BookingCard(booking: userBookings[index]),
                ),
              );
            },
      ),
    );
  }
}

class BookingCard extends StatelessWidget {
  final Booking booking;

  const BookingCard({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    final Car? car = context.read<CarProvider>().getCarById(booking.carId);
    if (car == null) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    car.imageUrl,
                    width: 80,
                    height: 60,
                    fit: BoxFit.cover,
                    errorBuilder:
                        (
                          BuildContext context,
                          Object error,
                          StackTrace? stackTrace,
                        ) {
                          return Container(
                            width: 80,
                            height: 60,
                            color: Colors.grey[300],
                            child: const Icon(
                              Icons.directions_car,
                              color: Colors.grey,
                            ),
                          );
                        },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        '${car.make} ${car.model}',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${DateFormat('dd/MM/yyyy').format(booking.startDate)} - ${DateFormat('dd/MM/yyyy').format(booking.endDate)}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      Text(
                        '${booking.totalPrice}€ • ${booking.durationDays} jour${booking.durationDays > 1 ? 's' : ''}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'ID: ${booking.id}', // Changed text
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStatusChip(booking.status),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(BookingStatus status) {
    Color color;
    String text;
    switch (status) {
      case BookingStatus.pending:
        color = AppTheme.warningColor;
        text = 'En attente';
        break;
      case BookingStatus.confirmed:
        color = AppTheme.successColor;
        text = 'Confirmée';
        break;
      case BookingStatus.completed:
        color = Colors.blue;
        text = 'Terminée';
        break;
      case BookingStatus.cancelled:
        color = AppTheme.errorColor;
        text = 'Annulée';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: withAlpha(color, 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// ----------- PROFILE SCREEN -----------
class ProfileView extends StatelessWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Consumer<UserProvider>(
        builder:
            (BuildContext context, UserProvider userProvider, Widget? child) {
              final User? user = userProvider.currentUser;
              if (user == null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      Icon(
                        Icons.person_off_outlined,
                        size: 80,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Utilisateur non connecté',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute<LoginView>(
                              builder: (BuildContext context) =>
                                  const LoginView(),
                            ),
                          );
                        },
                        child: const Text('Se connecter'),
                      ),
                    ],
                  ),
                );
              }

              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: <Widget>[
                    // Avatar and user info
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: <Color>[
                            withAlpha(
                              Theme.of(context).colorScheme.primary,
                              0.1,
                            ),
                            withAlpha(
                              Theme.of(context).colorScheme.secondary,
                              0.1,
                            ),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        children: <Widget>[
                          CircleAvatar(
                            radius: 50,
                            backgroundColor: Theme.of(
                              context,
                            ).colorScheme.primary,
                            child: Text(
                              user.username.isNotEmpty
                                  ? user.username[0].toUpperCase()
                                  : 'U',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            user.username,
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            user.email,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: Colors.grey[600]),
                          ),
                          if (user.phone != null) ...<Widget>[
                            const SizedBox(height: 4),
                            Text(
                              user.phone!,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(color: Colors.grey[600]),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.successColor.withAlpha(26),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: <Widget>[
                                const Icon(
                                  Icons.data_usage, // Changed icon
                                  size: 16,
                                  color: AppTheme.successColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Données Locales', // Changed text
                                  style: TextStyle(
                                    color: AppTheme.successColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    // Removed MongoDB info section entirely
                    // Menu options
                    _buildMenuSection(context, <Widget>[
                      _buildMenuItem(
                        context,
                        'Mes informations',
                        Icons.person_outlined,
                        () {},
                      ),
                      _buildMenuItem(
                        context,
                        'Synchroniser Données', // Changed text
                        Icons.sync,
                        () {
                          context.read<CarProvider>().refresh();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Synchronisation des données démarrée'), // Changed text
                            ),
                          );
                        },
                      ),
                      _buildMenuItem(
                        context,
                        'Mode sombre',
                        userProvider.isDarkMode
                            ? Icons.dark_mode
                            : Icons.light_mode,
                        userProvider.toggleTheme,
                        trailing: Switch(
                          value: userProvider.isDarkMode,
                          onChanged: (bool _) => userProvider.toggleTheme(),
                        ),
                      ),
                    ]),
                    const SizedBox(height: 32),
                    // Logout button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          showDialog<void>(
                            context: context,
                            builder: (BuildContext context) => AlertDialog(
                              title: const Text('Déconnexion'),
                              content: const Text(
                                'Êtes-vous sûr de vouloir vous déconnecter ?',
                              ),
                              actions: <Widget>[
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Annuler'),
                                ),
                                FilledButton(
                                  onPressed: () {
                                    userProvider.logout();
                                    Navigator.pushAndRemoveUntil(
                                      context,
                                      MaterialPageRoute<LoginView>(
                                        builder: (BuildContext context) =>
                                            const LoginView(),
                                      ),
                                      (Route<dynamic> route) => false,
                                    );
                                  },
                                  child: const Text('Déconnecter'),
                                ),
                              ],
                            ),
                          );
                        },
                        icon: const Icon(Icons.logout),
                        label: const Text('Se déconnecter'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.errorColor,
                          side: const BorderSide(color: AppTheme.errorColor),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: <Widget>[
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: withAlpha(Colors.black, 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: items
            .expand<Widget>(
              (Widget item) => <Widget>[item, const Divider(height: 1)],
            )
            .take(items.length * 2 - 1)
            .toList(),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap, {
    Widget? trailing,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: trailing ?? const Icon(Icons.chevron_right),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    );
  }
}

/// ----------- ENHANCED CAR CARD -----------
class EnhancedCarCard extends StatelessWidget {
  final Car car;

  const EnhancedCarCard({super.key, required this.car});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 8,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.hardEdge,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          PageRouteBuilder<void>(
            pageBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                ) => CarDetailsView(car: car),
            transitionsBuilder:
                (
                  BuildContext context,
                  Animation<double> animation,
                  Animation<double> secondaryAnimation,
                  Widget child,
                ) {
                  return FadeTransition(opacity: animation, child: child);
                },
            transitionDuration: const Duration(milliseconds: 500),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // Image with overlay
            Stack(
              children: <Widget>[
                Hero(
                  tag: car.id,
                  child: Container(
                    height: 200,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      image: DecorationImage(
                        image: NetworkImage(car.imageUrl),
                        fit: BoxFit.cover,
                      ),
                    ),
                    child: Image.network(
                      car.imageUrl,
                      width: double.infinity,
                      height: 200,
                      fit: BoxFit.cover,
                      errorBuilder:
                          (
                            BuildContext context,
                            Object error,
                            StackTrace? stackTrace,
                          ) {
                            return Container(
                              height: 200,
                              width: double.infinity,
                              color: Colors.grey[300],
                              child: const Icon(
                                Icons.directions_car,
                                size: 60,
                                color: Colors.grey,
                              ),
                            );
                          },
                    ),
                  ),
                ),
                // Gradient overlay
                Container(
                  height: 200,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: <Color>[
                        Colors.transparent,
                        withAlpha(Colors.black, 0.3),
                      ],
                    ),
                  ),
                ),
                // Category Badge (Replaced MongoDB Badge)
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary, // Using primary color for badge
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        const Icon(
                          Icons.category, // Changed icon
                          size: 12,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          car.category,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Price
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: <BoxShadow>[
                        BoxShadow(
                          color: withAlpha(Colors.black, 0.2),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      '${car.pricePerDay}€/jour',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  // Title and rating
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          '${car.make} ${car.model} (${car.year})',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Row(
                        children: <Widget>[
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            car.rating.toString(),
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Description
                  Text(
                    car.description,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  // ID
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.withAlpha(26), // 0.1 * 255 ≈ 26
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'ID: ${car.id}',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[600],
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Features
                  Row(
                    children: <Widget>[
                      _buildFeature(Icons.local_gas_station, car.fuelType),
                      const SizedBox(width: 16),
                      _buildFeature(Icons.settings, car.transmission),
                      const SizedBox(width: 16),
                      _buildFeature(Icons.people, '${car.seats} places'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Availability Status
                  Row(
                    children: <Widget>[
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: car.isAvailable
                              ? AppTheme.successColor
                              : AppTheme.errorColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        car.isAvailable ? 'Disponible' : 'Non disponible',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: car.isAvailable
                              ? AppTheme.successColor
                              : AppTheme.errorColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeature(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }
}

/// ----------- CAR DETAILS -----------
class CarDetailsView extends StatelessWidget {
  final Car car;

  const CarDetailsView({super.key, required this.car});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: <Widget>[
          // App Bar with image
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: car.id,
                child: Container(
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: NetworkImage(car.imageUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                  child: Image.network(
                    car.imageUrl,
                    width: double.infinity,
                    height: 300,
                    fit: BoxFit.cover,
                    errorBuilder:
                        (
                          BuildContext context,
                          Object error,
                          StackTrace? stackTrace,
                        ) {
                          return Container(
                            height: 300,
                            width: double.infinity,
                            color: Colors.grey[300],
                            child: const Icon(
                              Icons.directions_car,
                              size: 100,
                              color: Colors.grey,
                            ),
                          );
                        },
                  ),
                ),
              ),
            ),
            actions: <Widget>[
              IconButton(
                icon: const Icon(Icons.favorite_border),
                onPressed: () {},
              ),
              IconButton(icon: const Icon(Icons.share), onPressed: () {}),
              const SizedBox(width: 16),
            ],
          ),
          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  // Data Source Badge (Replaced MongoDB Badge)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withAlpha(26),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppTheme.successColor.withAlpha(77),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        const Icon(
                          Icons.data_usage, // Changed icon
                          size: 16,
                          color: AppTheme.successColor,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Données Locales', // Changed text
                          style: TextStyle(
                            color: AppTheme.successColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Header with price
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              '${car.make} ${car.model}',
                              style: Theme.of(context).textTheme.headlineMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Année ${car.year}',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: <Widget>[
                          Text(
                            '${car.pricePerDay}€',
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          Text(
                            'par jour',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Description
                  Text(
                    'Description',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    car.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                  // Features
                  Text(
                    'Caractéristiques',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      _buildFeatureChip(Icons.local_gas_station, car.fuelType),
                      _buildFeatureChip(Icons.settings, car.transmission),
                      _buildFeatureChip(Icons.people, '${car.seats} places'),
                      ...car.features.map<Widget>(
                        (String feature) =>
                            _buildFeatureChip(Icons.check, feature),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Removed MongoDB information section
                  // Booking button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton.icon(
                      onPressed: car.isAvailable
                          ? () => _showBookingBottomSheet(context)
                          : null,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(
                        car.isAvailable
                            ? 'Réserver maintenant'
                            : 'Non disponible',
                      ),
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 16, color: Colors.grey.shade700),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
        ],
      ),
    );
  }

  void _showBookingBottomSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) => BookingBottomSheet(car: car),
    );
  }
}

/// ----------- BOOKING BOTTOM SHEET -----------
class BookingBottomSheet extends StatefulWidget {
  final Car car;

  const BookingBottomSheet({super.key, required this.car});

  @override
  State<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends State<BookingBottomSheet> {
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  Widget build(BuildContext context) {
    final int days = _startDate != null && _endDate != null
        ? _endDate!.difference(_startDate!).inDays + 1
        : 0;
    final double totalPrice = days * widget.car.pricePerDay;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Réserver ${widget.car.make} ${widget.car.model}',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            // Data stored info
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withAlpha(26), // 0.1 * 255 ≈ 26
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Réservation stockée localement', // Changed text
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.successColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Date selection
            Row(
              children: <Widget>[
                Expanded(
                  child: _buildDateSelector(
                    context,
                    'Date de début',
                    _startDate,
                    (DateTime date) => setState(() => _startDate = date),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildDateSelector(
                    context,
                    'Date de fin',
                    _endDate,
                    (DateTime date) => setState(() => _endDate = date),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Booking summary
            if (_startDate != null && _endDate != null) ...<Widget>[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: withAlpha(
                    Theme.of(context).colorScheme.primaryContainer,
                    77, // 0.3 * 255 ≈ 77
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: <Widget>[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        const Text('Durée de location'),
                        Text('$days jour${days > 1 ? 's' : ''}'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        const Text('Prix par jour'),
                        Text('${widget.car.pricePerDay}€'),
                      ],
                    ),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        Text(
                          'Prix total',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${totalPrice.toStringAsFixed(0)}€',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
            // Confirmation button
            Consumer<BookingProvider>(
              builder:
                  (
                    BuildContext context,
                    BookingProvider bookingProvider,
                    Widget? child,
                  ) {
                    return SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed:
                            (_startDate != null &&
                                _endDate != null &&
                                !bookingProvider.isLoading)
                            ? () => _confirmBooking(context)
                            : null,
                        child: bookingProvider.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : const Text('Confirmer la réservation'),
                      ),
                    );
                  },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildDateSelector(
    BuildContext context,
    String label,
    DateTime? selectedDate,
    void Function(DateTime) onDateSelected,
  ) {
    return InkWell(
      onTap: () async {
        final DateTime? date = await showDatePicker(
          context: context,
          initialDate: selectedDate ?? DateTime.now(),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );
        if (date != null) {
          onDateSelected(date);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
            ),
            const SizedBox(height: 4),
            Text(
              selectedDate != null
                  ? DateFormat('dd/MM/yyyy').format(selectedDate)
                  : 'Choisir une date',
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmBooking(BuildContext context) async {
    if (_startDate == null || _endDate == null) return;

    final UserProvider userProvider = context.read<UserProvider>();
    final BookingProvider bookingProvider = context.read<BookingProvider>();

    await bookingProvider.addBooking(
      userId: userProvider.currentUser!.id,
      carId: widget.car.id,
      startDate: _startDate!,
      endDate: _endDate!,
      totalPrice:
          (_endDate!.difference(_startDate!).inDays + 1) *
          widget.car.pricePerDay,
    );

    if (mounted) {
      Navigator.pop(context); // Pop BookingBottomSheet
      Navigator.pop(context); // Pop CarDetailsView
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: <Widget>[
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Réservation confirmée localement pour ${widget.car.make} ${widget.car.model}', // Changed text
                ),
              ),
            ],
          ),
          backgroundColor: AppTheme.successColor,
          action: SnackBarAction(
            label: 'Voir',
            textColor: Colors.white,
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute<BookingsView>(
                  builder: (BuildContext context) => const BookingsView(),
                ),
              );
            },
          ),
        ),
      );
    }
  }
}
