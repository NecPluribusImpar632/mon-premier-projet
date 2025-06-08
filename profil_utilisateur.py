def saisir_profil_utilisateur():
    profil = {}

    try:
        profil["âge"] = int(input("Quel est votre âge ? "))
        if profil["âge"] <= 0:
            raise ValueError("L'âge doit être supérieur à 0.")
        profil["poids"] = float(input("Quel est votre poids (en kg) ? "))
        profil["taille"] = float(input("Quelle est votre taille (en cm) ? "))
        profil["sexe"] = input("Quel est votre sexe ? (homme/femme/autre) ").strip().lower()
        profil["objectif"] = input("Quel est votre objectif ? ")
        profil["régime"] = input("Quel est votre régime alimentaire ? ")
        profil["allergies"] = input("Avez-vous des allergies ? ")
        profil["préférences"] = input("Des préférences ou restrictions ? ")
    except ValueError as e:
        print("Erreur de saisie :", e)
        return None

    return profil
