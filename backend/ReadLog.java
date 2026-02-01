
import java.nio.file.Files;
import java.nio.file.Paths;

public class ReadLog {
    public static void main(String[] args) throws Exception {
        Files.lines(Paths.get("build_error.log")).forEach(System.out::println);
    }
}
