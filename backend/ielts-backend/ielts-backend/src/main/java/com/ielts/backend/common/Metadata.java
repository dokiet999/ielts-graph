package com.ielts.backend.common;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Metadata {
    private Integer code;
    private Integer page;
    private Integer size;
    private Long total;
}
