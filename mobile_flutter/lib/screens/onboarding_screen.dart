import 'package:flutter/material.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({
    super.key,
    required this.onComplete,
  });

  final VoidCallback onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();

  int _page = 0;

  final steps = const [
    (
      title: 'Bienvenue sur Bluwa',
      description:
          'Gérez vos opérations terrain plus rapidement : réception, inventaire, qualité, production et ventes.',
      icon: Icons.flash_on,
    ),
    (
      title: 'Travaillez en toute mobilité',
      description:
          'Vos données sont disponibles partout et synchronisées en temps réel.',
      icon: Icons.wifi,
    ),
    (
      title: 'Connexion simplifiée',
      description:
          'Sauvegardez vos identifiants et accédez rapidement à votre espace.',
      icon: Icons.lock_outline,
    ),
  ];

  void _next() {
    if (_page == steps.length - 1) {
      widget.onComplete();
      return;
    }

    _controller.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 30),

           

            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: steps.length,
                onPageChanged: (index) {
                  setState(() {
                    _page = index;
                  });
                },
                itemBuilder: (context, index) {
                  final step = steps[index];

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(32),
                          ),
                          child: Icon(
                            step.icon,
                            size: 70,
                            color: const Color(0xFF2563EB),
                          ),
                        ),

                        const SizedBox(height: 35),

                        Text(
                          step.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),

                        const SizedBox(height: 18),

                        Text(
                          step.description,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            height: 1.6,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                steps.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  width: _page == index ? 28 : 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: _page == index
                        ? const Color(0xFF2563EB)
                        : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 25),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _next,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _page == steps.length - 1
                        ? 'Commencer'
                        : 'Suivant',
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}