package com.jess.shop.notification.dto;

import java.util.List;

public class ResendDtos {

    public record SendEmailRequest(String from, List<String> to, String subject, String html) {}
}
