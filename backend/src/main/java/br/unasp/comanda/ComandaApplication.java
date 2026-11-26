package br.unasp.comanda;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class ComandaApplication {

    public static void main(String[] args) {
        // Datas e "faturamento do dia" sempre no horário de Brasília, mesmo com o servidor em UTC.
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(ComandaApplication.class, args);
    }
}
