package br.unasp.comanda.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Implementação do algoritmo de validação de CNPJ (RN07).
 * 1. Remove a máscara e exige 14 dígitos.
 * 2. Rejeita sequências repetidas (ex.: 00000000000000).
 * 3. Calcula os dois dígitos verificadores com os pesos oficiais.
 */
public class CnpjValidator implements ConstraintValidator<Cnpj, String> {

    private static final int[] PESOS_DV1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] PESOS_DV2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        if (valor == null || valor.isBlank()) {
            return true; // obrigatoriedade fica a cargo do @NotBlank
        }
        return valido(valor);
    }

    public static boolean valido(String valor) {
        String cnpj = somenteDigitos(valor);
        if (cnpj.length() != 14 || cnpj.chars().distinct().count() == 1) {
            return false;
        }
        int dv1 = calcularDigito(cnpj.substring(0, 12), PESOS_DV1);
        int dv2 = calcularDigito(cnpj.substring(0, 12) + dv1, PESOS_DV2);
        return cnpj.equals(cnpj.substring(0, 12) + dv1 + dv2);
    }

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    private static int calcularDigito(String base, int[] pesos) {
        int soma = 0;
        for (int i = 0; i < base.length(); i++) {
            soma += Character.getNumericValue(base.charAt(i)) * pesos[i];
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
